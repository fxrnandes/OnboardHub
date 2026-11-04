import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express, { type Express } from 'express';
import type pg from 'pg';
import { requireAuth } from './http/auth.middleware.js';
import { errorHandler } from './http/errors.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { AuthService } from './modules/auth/auth.service.js';
import { PasswordResetService } from './modules/auth/password-reset.service.js';
import { TokenService } from './modules/auth/token.js';
import { inviteRoutes } from './modules/invites/invite.routes.js';
import { InviteService } from './modules/invites/invite.service.js';
import { LogMailer, type Mailer } from './modules/mail/mailer.js';
import { learningRoutes } from './modules/learning/learning.routes.js';
import { mediaRoutes } from './modules/media/media.routes.js';
import { MediaService, type MediaLimits } from './modules/media/media.service.js';
import { LocalDiskStorage, type MediaStorage } from './modules/media/storage.js';
import { LearningService } from './modules/learning/learning.service.js';
import { jobRoleRoutes } from './modules/job-roles/job-role.routes.js';
import { memberRoutes } from './modules/members/member.routes.js';
import { reportRoutes } from './modules/reports/report.routes.js';
import { trailRoutes } from './modules/trails/trail.routes.js';
import { TrailService } from './modules/trails/trail.service.js';
import { healthRouter } from './routes/health.routes.js';

export interface AppDependencies {
  pool: pg.Pool;
  jwtSecret: string;
  appUrl: string;
  mailer?: Mailer;
  storage?: MediaStorage;
  mediaLimits?: MediaLimits;
}

export function createApp({
  pool,
  jwtSecret,
  appUrl,
  mailer = new LogMailer(),
  storage = new LocalDiskStorage(join(tmpdir(), 'onboardhub-media'), jwtSecret, '/api'),
  mediaLimits,
}: AppDependencies): Express {
  const app = express();
  const tokens = new TokenService(jwtSecret);
  const authenticated = requireAuth(tokens, pool);

  const media = new MediaService(pool, storage, mediaLimits);

  app.use(express.json());

  app.use('/health', healthRouter);
  const resets = new PasswordResetService(pool, tokens, mailer, appUrl);
  app.use('/auth', authRoutes(new AuthService(pool, tokens), resets, authenticated));
  app.use('/job-roles', jobRoleRoutes(pool, authenticated));
  app.use('/members', memberRoutes(pool, authenticated));
  app.use('/invites', inviteRoutes(pool, new InviteService(pool, tokens, appUrl), authenticated));
  app.use('/reports', reportRoutes(pool, authenticated));
  app.use('/media', mediaRoutes(media, storage, authenticated));
  app.use('/my', learningRoutes(new LearningService(pool, media), authenticated));
  app.use(trailRoutes(new TrailService(pool, media), authenticated));

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'not_found', message: 'Rota não encontrada.' } });
  });

  app.use(errorHandler);

  return app;
}
