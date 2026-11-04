import { createApp } from './app.js';
import { requireEnv } from './config/env.js';
import { createPool } from './db/pool.js';
import { createMailer } from './modules/mail/mailer.js';
import { createStorage } from './modules/media/storage.js';

const port = Number(process.env.PORT ?? 3333);

const jwtSecret = requireEnv('JWT_SECRET');

const app = createApp({
  pool: createPool(requireEnv('DATABASE_URL')),
  jwtSecret,
  storage: createStorage(process.env, jwtSecret),
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  mailer: createMailer(),
});

app.listen(port, () => {
  console.log(`API do OnboardHub rodando em http://localhost:${port}`);
});
