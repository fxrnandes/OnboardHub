import express, { type Express } from 'express';
import type pg from 'pg';
import { requireAuth } from './http/auth.middleware.js';
import { errorHandler } from './http/errors.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { AuthService } from './modules/auth/auth.service.js';
import { TokenService } from './modules/auth/token.js';
import { inviteRoutes } from './modules/invites/invite.routes.js';
import { InviteService } from './modules/invites/invite.service.js';
import { learningRoutes } from './modules/learning/learning.routes.js';
import { LearningService } from './modules/learning/learning.service.js';
import { jobRoleRoutes } from './modules/job-roles/job-role.routes.js';
import { memberRoutes } from './modules/members/member.routes.js';
import { trailRoutes } from './modules/trails/trail.routes.js';
import { TrailService } from './modules/trails/trail.service.js';
import { healthRouter } from './routes/health.routes.js';

export interface AppDependencies {
  pool: pg.Pool;
  jwtSecret: string;
  appUrl: string;
}

export function createApp({ pool, jwtSecret, appUrl }: AppDependencies): Express {
  const app = express();
  const tokens = new TokenService(jwtSecret);
  const authenticated = requireAuth(tokens, pool);

  app.use(express.json());

  app.use('/health', healthRouter);
  app.use('/auth', authRoutes(new AuthService(pool, tokens), authenticated));
  app.use('/job-roles', jobRoleRoutes(pool, authenticated));
  app.use('/members', memberRoutes(pool, authenticated));
  app.use('/invites', inviteRoutes(pool, new InviteService(pool, tokens, appUrl), authenticated));
  app.use('/my', learningRoutes(new LearningService(pool), authenticated));
  app.use(trailRoutes(new TrailService(pool), authenticated));

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'not_found', message: 'Rota não encontrada.' } });
  });

  app.use(errorHandler);

  return app;
}
