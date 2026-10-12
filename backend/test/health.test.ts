import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createTestApp } from './support/app.js';

const { app, pool } = createTestApp();
afterAll(() => pool.end());

describe('GET /health', () => {
  it('responde 200 informando que a API está no ar', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('informa o horário da resposta em formato ISO', async () => {
    const res = await request(app).get('/health');

    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });
});

describe('rota inexistente', () => {
  it('responde 404 com mensagem em português', async () => {
    const res = await request(app).get('/nao-existe');

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Rota não encontrada.');
  });
});
