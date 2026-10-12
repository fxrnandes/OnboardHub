import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import type { Queryable } from '../../db/pool.js';
import { AppError } from '../../http/errors.js';
import { requireRole } from '../../http/auth.middleware.js';
import { idParam } from '../../http/params.js';
import { JobRoleRepository } from './job-role.repository.js';

const nameSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do cargo.').max(80, 'O nome do cargo pode ter no máximo 80 caracteres.'),
});

const UNIQUE_VIOLATION = '23505';

const duplicatedName = (error: unknown) => {
  if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
    return new AppError(409, 'job_role_name_taken', 'Já existe um cargo com esse nome.');
  }
  return error;
};

const notFound = () => new AppError(404, 'not_found', 'Cargo não encontrado.');

export function jobRoleRoutes(db: Queryable, requireAuth: RequestHandler): Router {
  const router = Router();
  const jobRoles = new JobRoleRepository(db);

  router.use(requireAuth);

  router.get('/', async (req, res) => {
    res.json({ jobRoles: await jobRoles.list(req.auth!.companyId) });
  });

  router.post('/', requireRole('master'), async (req, res) => {
    const { name } = nameSchema.parse(req.body);
    const jobRole = await jobRoles.create(req.auth!.companyId, name).catch((error) => {
      throw duplicatedName(error);
    });
    res.status(201).json({ jobRole });
  });

  router.patch('/:id', requireRole('master'), async (req, res) => {
    const id = idParam(req.params.id, 'Cargo');
    const { name } = nameSchema.parse(req.body);
    const jobRole = await jobRoles.rename(req.auth!.companyId, id, name).catch((error) => {
      throw duplicatedName(error);
    });
    if (!jobRole) throw notFound();
    res.json({ jobRole });
  });

  router.delete('/:id', requireRole('master'), async (req, res) => {
    const id = idParam(req.params.id, 'Cargo');
    if (!(await jobRoles.delete(req.auth!.companyId, id))) throw notFound();
    res.status(204).end();
  });

  return router;
}
