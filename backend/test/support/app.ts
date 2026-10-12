import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/app.js';
import { createTestPool } from './db.js';

export const TEST_JWT_SECRET = 'segredo-dos-testes';

export function createTestApp() {
  const pool = createTestPool();
  const app = createApp({ pool, jwtSecret: TEST_JWT_SECRET });
  return { app, pool };
}

export const uniqueEmail = (prefix = 'pessoa') => `${prefix}-${randomUUID().slice(0, 8)}@teste.com`;
