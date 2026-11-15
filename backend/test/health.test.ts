import express from 'express';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { healthRoutes } from '../src/routes/health.routes.js';
import { createTestApp } from './support/app.js';

const { app, pool } = createTestApp();
afterAll(() => pool.end());

describe('GET /health', () => {
  it('responde 200 informando que a API está no ar', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('ok');
  });

  it('responde 503 quando o banco não responde', async () => {
    const broken = { query: () => Promise.reject(new Error('sem banco')) };
    const res = await request(express().use('/health', healthRoutes(broken))).get('/health');

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'degraded', database: 'unavailable' });
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
