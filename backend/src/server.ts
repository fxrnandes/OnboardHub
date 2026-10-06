import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3333);

createApp().listen(port, () => {
  console.log(`API do OnboardHub rodando em http://localhost:${port}`);
});
