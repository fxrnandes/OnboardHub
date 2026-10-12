import express, { type Express } from 'express';
import { healthRouter } from './routes/health.routes.js';

export function createApp(): Express {
  const app = express();

  app.use(express.json());

  app.use('/health', healthRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'not_found', message: 'Rota não encontrada.' } });
  });

  return app;
}
