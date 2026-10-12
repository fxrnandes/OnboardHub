import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import type { Queryable } from '../../db/pool.js';
import { AppError } from '../../http/errors.js';
import { requireRole } from '../../http/auth.middleware.js';
import { idParam } from '../../http/params.js';
import { JobRoleRepository } from '../job-roles/job-role.repository.js';
import { UserRepository, type User } from '../users/user.repository.js';

const changesSchema = z
  .object({
    role: z.enum(['master', 'gestor', 'colaborador'], 'Papel inválido.').optional(),
    jobRoleId: z.uuid('Cargo inválido.').nullable().optional(),
  })
  .refine((changes) => changes.role !== undefined || changes.jobRoleId !== undefined, 'Nada para alterar.');

export const toMember = ({ id, name, email, role, jobRoleId, createdAt }: User) => ({
  id,
  name,
  email,
  role,
  jobRoleId,
  createdAt,
});

const notFound = () => new AppError(404, 'not_found', 'Pessoa não encontrada.');

export function memberRoutes(db: Queryable, requireAuth: RequestHandler): Router {
  const router = Router();
  const users = new UserRepository(db);
  const jobRoles = new JobRoleRepository(db);

  router.use(requireAuth);

  router.get('/', requireRole('master', 'gestor'), async (req, res) => {
    const members = await users.listByCompany(req.auth!.companyId);
    res.json({ members: members.map(toMember) });
  });

  router.patch('/:id', requireRole('master'), async (req, res) => {
    const { companyId } = req.auth!;
    const id = idParam(req.params.id, 'Pessoa');
    const changes = changesSchema.parse(req.body);

    const member = await users.findInCompany(companyId, id);
    if (!member) throw notFound();

    if (changes.jobRoleId && !(await jobRoles.find(companyId, changes.jobRoleId))) {
      throw new AppError(400, 'job_role_not_found', 'Cargo não encontrado.');
    }

    const losingMaster = member.role === 'master' && changes.role !== undefined && changes.role !== 'master';
    if (losingMaster && (await users.countMasters(companyId)) <= 1) {
      throw new AppError(409, 'last_master', 'A empresa precisa ter pelo menos um master.');
    }

    res.json({ member: toMember(await users.update(companyId, id, changes)) });
  });

  router.delete('/:id', requireRole('master'), async (req, res) => {
    const { companyId, userId } = req.auth!;
    const id = idParam(req.params.id, 'Pessoa');

    if (id === userId) {
      throw new AppError(400, 'cannot_remove_self', 'Você não pode remover a si mesmo.');
    }
    if (!(await users.findInCompany(companyId, id))) throw notFound();

    await users.delete(companyId, id);
    res.status(204).end();
  });

  return router;
}
