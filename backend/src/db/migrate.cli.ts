import { fileURLToPath } from 'node:url';
import { requireEnv } from '../config/env.js';
import { migrate } from './migrate.js';
import { createPool } from './pool.js';

const migrationsDir = fileURLToPath(new URL('../../db/migrations', import.meta.url));
const pool = createPool(requireEnv('DATABASE_URL'));

try {
  const applied = await migrate(pool, migrationsDir);
  console.log(applied.length ? `Migrações aplicadas: ${applied.join(', ')}` : 'Banco já está atualizado.');
} finally {
  await pool.end();
}
