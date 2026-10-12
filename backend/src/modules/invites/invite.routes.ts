import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import type { Queryable } from '../../db/pool.js';
import { AppError } from '../../http/errors.js';
import { requireRole } from '../../http/auth.middleware.js';
import { idParam } from '../../http/params.js';
import { InviteRepository, type Invite } from './invite.repository.js';
import type { InviteService } from './invite.service.js';

const email = z.string().trim().toLowerCase().pipe(z.email('E-mail inválido.'));

const createSchema = z.object({
  email: email.nullish(),
  role: z.enum(['gestor', 'colaborador'], 'Papel inválido.').default('colaborador'),
  jobRoleId: z.uuid('Cargo inválido.').nullish(),
});

const acceptSchema = z.object({
  name: z.string().trim().min(2, 'O nome precisa ter pelo menos 2 caracteres.').max(120),
  email: email.optional(),
  password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.').max(72),
});

const toResponse = ({ id, email, role, jobRoleId, jobRoleName, status, expiresAt, createdAt }: Invite) => ({
  id,
  email,
  role,
  jobRoleId,
  jobRoleName,
  status,
  expiresAt,
  createdAt,
});

export function inviteRoutes(db: Queryable, service: InviteService, requireAuth: RequestHandler): Router {
  const router = Router();
  const invites = new InviteRepository(db);

  router.get('/token/:token', async (req, res) => {
    const invite = await service.preview(String(req.params.token));
    res.json({
      invite: {
        companyName: invite.companyName,
        email: invite.email,
        role: invite.role,
        jobRoleName: invite.jobRoleName,
        expiresAt: invite.expiresAt,
      },
    });
  });

  router.post('/token/:token/accept', async (req, res) => {
    const { token, user } = await service.accept(String(req.params.token), acceptSchema.parse(req.body));
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, jobRoleId: user.jobRoleId },
    });
  });

  router.use(requireAuth, requireRole('master'));

  router.get('/', async (req, res) => {
    const list = await invites.list(req.auth!.companyId);
    res.json({ invites: list.map(toResponse) });
  });

  router.post('/', async (req, res) => {
    const input = createSchema.parse(req.body);
    const { invite, link } = await service.create({
      ...input,
      companyId: req.auth!.companyId,
      createdBy: req.auth!.userId,
    });
    res.status(201).json({ invite: toResponse(invite), link });
  });

  router.delete('/:id', async (req, res) => {
    const id = idParam(req.params.id, 'Convite');
    if (!(await invites.revoke(req.auth!.companyId, id))) {
      throw new AppError(404, 'not_found', 'Convite pendente não encontrado.');
    }
    res.status(204).end();
  });

  return router;
}
