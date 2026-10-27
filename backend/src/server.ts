import { createApp } from './app.js';
import { requireEnv } from './config/env.js';
import { createPool } from './db/pool.js';
import { createMailer } from './modules/mail/mailer.js';

const port = Number(process.env.PORT ?? 3333);

const app = createApp({
  pool: createPool(requireEnv('DATABASE_URL')),
  jwtSecret: requireEnv('JWT_SECRET'),
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  mailer: createMailer(),
});

app.listen(port, () => {
  console.log(`API do OnboardHub rodando em http://localhost:${port}`);
});
