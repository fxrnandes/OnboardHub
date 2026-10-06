import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('GET /health', () => {
  it('responde 200 informando que a API está no ar', async () => {
    const res = await request(createApp()).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('informa o horário da resposta em formato ISO', async () => {
    const res = await request(createApp()).get('/health');

    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });
});

describe('rota inexistente', () => {
  it('responde 404 com mensagem em português', async () => {
    const res = await request(createApp()).get('/nao-existe');

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Rota não encontrada.');
  });
});
