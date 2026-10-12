import express, { type Express } from 'express';
import type pg from 'pg';
import { errorHandler } from './http/errors.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { AuthService } from './modules/auth/auth.service.js';
import { TokenService } from './modules/auth/token.js';
import { healthRouter } from './routes/health.routes.js';

export interface AppDependencies {
  pool: pg.Pool;
  jwtSecret: string;
}

export function createApp({ pool, jwtSecret }: AppDependencies): Express {
  const app = express();
  const tokens = new TokenService(jwtSecret);
  const auth = new AuthService(pool, tokens);

  app.use(express.json());

  app.use('/health', healthRouter);
  app.use('/auth', authRoutes(auth, tokens));

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'not_found', message: 'Rota não encontrada.' } });
  });

  app.use(errorHandler);

  return app;
}
