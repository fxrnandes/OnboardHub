import { Router } from 'express';
import type { Queryable } from '../db/pool.js';

const DB_TIMEOUT_MS = 2000;

async function databaseAnswers(db: Queryable): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), DB_TIMEOUT_MS);
  });
  try {
    await Promise.race([db.query('select 1'), timeout]);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function healthRoutes(db: Queryable): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    const healthy = await databaseAnswers(db);
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      database: healthy ? 'ok' : 'unavailable',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
