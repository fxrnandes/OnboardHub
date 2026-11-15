import { createApp } from './app.js';
import { requireEnv } from './config/env.js';
import { createPool } from './db/pool.js';
import { closeOnSignal } from './http/shutdown.js';
import { createMailer } from './modules/mail/mailer.js';
import { createStorage } from './modules/media/storage.js';

const port = Number(process.env.PORT ?? 3333);

const jwtSecret = requireEnv('JWT_SECRET');

if (jwtSecret.length < 32) {
  console.warn('JWT_SECRET tem menos de 32 caracteres. Use um segredo longo e aleatório.');
}

const pool = createPool(requireEnv('DATABASE_URL'));

const app = createApp({
  pool,
  jwtSecret,
  storage: createStorage(process.env, jwtSecret),
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  mailer: createMailer(),
});

const server = app.listen(port, () => {
  console.log(`API do OnboardHub rodando em http://localhost:${port}`);
});

closeOnSignal(server, pool);
