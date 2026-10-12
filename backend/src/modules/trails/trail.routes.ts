import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { requireRole } from '../../http/auth.middleware.js';
import { idParam } from '../../http/params.js';
import type { TrailService } from './trail.service.js';

const title = z.string().trim().min(1, 'Informe o título.').max(160, 'O título pode ter no máximo 160 caracteres.');
const description = z.string().trim().max(2000, 'A descrição pode ter no máximo 2000 caracteres.');
const url = z
  .string()
  .trim()
  .max(2000)
  .regex(/^https?:\/\/\S+$/i, 'Informe uma URL começando com http:// ou https://.');
const kind = z.enum(['text', 'link', 'video', 'image'], 'Tipo de passo inválido.');
const body = z.string().max(50000, 'O conteúdo pode ter no máximo 50000 caracteres.');

const createTrailSchema = z.object({ title, description: description.default('') });
const updateTrailSchema = z
  .object({ title: title.optional(), description: description.optional() })
  .refine((changes) => changes.title !== undefined || changes.description !== undefined, 'Nada para alterar.');
const jobRolesSchema = z.object({ jobRoleIds: z.array(z.uuid('Cargo inválido.')).max(100) });
const moduleSchema = z.object({ title });
const orderSchema = (field: 'moduleIds' | 'stepIds') => z.object({ [field]: z.array(z.uuid('Id inválido.')) });
const createStepSchema = z.object({ title, kind, body: body.nullish(), url: url.nullish() });
const updateStepSchema = z
  .object({ title: title.optional(), kind: kind.optional(), body: body.nullish(), url: url.nullish() })
  .refine((changes) => Object.values(changes).some((value) => value !== undefined), 'Nada para alterar.');

export function trailRoutes(service: TrailService, requireAuth: RequestHandler): Router {
  const router = Router();

  router.use(['/trails', '/modules', '/steps'], requireAuth, requireRole('master', 'gestor'));

  router.get('/trails', async (req, res) => {
    res.json({ trails: await service.list(req.auth!.companyId) });
  });

  router.post('/trails', async (req, res) => {
    const input = createTrailSchema.parse(req.body);
    const trail = await service.create(req.auth!.companyId, req.auth!.userId, input.title, input.description);
    res.status(201).json({ trail });
  });

  router.get('/trails/:id', async (req, res) => {
    res.json({ trail: await service.get(req.auth!.companyId, idParam(req.params.id, 'Trilha')) });
  });

  router.patch('/trails/:id', async (req, res) => {
    const changes = updateTrailSchema.parse(req.body);
    res.json({ trail: await service.update(req.auth!.companyId, idParam(req.params.id, 'Trilha'), changes) });
  });

  router.delete('/trails/:id', async (req, res) => {
    await service.delete(req.auth!.companyId, idParam(req.params.id, 'Trilha'));
    res.status(204).end();
  });

  router.post('/trails/:id/duplicate', async (req, res) => {
    const trail = await service.duplicate(req.auth!.companyId, idParam(req.params.id, 'Trilha'), req.auth!.userId);
    res.status(201).json({ trail });
  });

  router.post('/trails/:id/publish', async (req, res) => {
    res.json(await service.publish(req.auth!.companyId, idParam(req.params.id, 'Trilha')));
  });

  router.post('/trails/:id/unpublish', async (req, res) => {
    res.json({ trail: await service.unpublish(req.auth!.companyId, idParam(req.params.id, 'Trilha')) });
  });

  router.put('/trails/:id/job-roles', async (req, res) => {
    const { jobRoleIds } = jobRolesSchema.parse(req.body);
    const saved = await service.setJobRoles(req.auth!.companyId, idParam(req.params.id, 'Trilha'), jobRoleIds);
    res.json({ jobRoleIds: saved });
  });

  router.post('/trails/:id/modules', async (req, res) => {
    const input = moduleSchema.parse(req.body);
    const module = await service.addModule(req.auth!.companyId, idParam(req.params.id, 'Trilha'), input.title);
    res.status(201).json({ module });
  });

  router.put('/trails/:id/modules/order', async (req, res) => {
    const { moduleIds } = orderSchema('moduleIds').parse(req.body) as { moduleIds: string[] };
    await service.reorderModules(req.auth!.companyId, idParam(req.params.id, 'Trilha'), moduleIds);
    res.json({ moduleIds });
  });

  router.patch('/modules/:id', async (req, res) => {
    const input = moduleSchema.parse(req.body);
    res.json({ module: await service.renameModule(req.auth!.companyId, idParam(req.params.id, 'Módulo'), input.title) });
  });

  router.delete('/modules/:id', async (req, res) => {
    await service.deleteModule(req.auth!.companyId, idParam(req.params.id, 'Módulo'));
    res.status(204).end();
  });

  router.post('/modules/:id/steps', async (req, res) => {
    const input = createStepSchema.parse(req.body);
    const step = await service.addStep(req.auth!.companyId, idParam(req.params.id, 'Módulo'), input);
    res.status(201).json({ step });
  });

  router.put('/modules/:id/steps/order', async (req, res) => {
    const { stepIds } = orderSchema('stepIds').parse(req.body) as { stepIds: string[] };
    await service.reorderSteps(req.auth!.companyId, idParam(req.params.id, 'Módulo'), stepIds);
    res.json({ stepIds });
  });

  router.patch('/steps/:id', async (req, res) => {
    const changes = updateStepSchema.parse(req.body);
    res.json({ step: await service.updateStep(req.auth!.companyId, idParam(req.params.id, 'Passo'), changes) });
  });

  router.delete('/steps/:id', async (req, res) => {
    await service.deleteStep(req.auth!.companyId, idParam(req.params.id, 'Passo'));
    res.status(204).end();
  });

  return router;
}
