import { Router } from 'express';

/**
 * Rota de verificação de saúde. Usada pelo monitoramento e pelo deploy
 * para saber se a API está respondendo.
 */
export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
