import { Router, type Request, type RequestHandler } from 'express';
import { idParam } from '../../http/params.js';
import type { Learner } from './learning.repository.js';
import type { LearningService } from './learning.service.js';

const learner = (req: Request): Learner => ({
  userId: req.auth!.userId,
  companyId: req.auth!.companyId,
  jobRoleId: req.auth!.jobRoleId,
});

export function learningRoutes(service: LearningService, requireAuth: RequestHandler): Router {
  const router = Router();

  router.use(requireAuth);

  router.get('/trails', async (req, res) => {
    res.json({ trails: await service.listTrails(learner(req)) });
  });

  router.get('/trails/:id', async (req, res) => {
    res.json(await service.openTrail(learner(req), idParam(req.params.id, 'Trilha')));
  });

  router.post('/steps/:id/complete', async (req, res) => {
    res.json({ progress: await service.complete(learner(req), idParam(req.params.id, 'Passo')) });
  });

  router.delete('/steps/:id/complete', async (req, res) => {
    res.json({ progress: await service.uncomplete(learner(req), idParam(req.params.id, 'Passo')) });
  });

  return router;
}
