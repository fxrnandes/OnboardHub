import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it, vi } from 'vitest';
import { closeOnSignal, shutdown } from '../../src/http/shutdown.js';

const listen = (server: ReturnType<typeof createServer>) =>
  new Promise<number>((resolve) => server.listen(0, () => resolve((server.address() as AddressInfo).port)));

describe('encerramento da API', () => {
  it('termina a requisição em andamento antes de fechar o banco', async () => {
    const order: string[] = [];
    const server = createServer((_req, res) => {
      setTimeout(() => {
        order.push('resposta');
        res.end('ok');
      }, 50);
    });
    const port = await listen(server);
    const pool = { end: vi.fn(async () => void order.push('banco')) };

    const pending = fetch(`http://localhost:${port}/`).then((res) => res.text());
    await new Promise((resolve) => setTimeout(resolve, 10));
    await shutdown(server, pool);

    expect(await pending).toBe('ok');
    expect(order).toEqual(['resposta', 'banco']);
    expect(server.listening).toBe(false);
  });

  it('corta as conexões que passam do prazo', async () => {
    const server = createServer(() => undefined);
    const port = await listen(server);
    const pool = { end: vi.fn(async () => undefined) };

    const pending = fetch(`http://localhost:${port}/`).catch(() => 'cortada');
    await new Promise((resolve) => setTimeout(resolve, 10));
    await shutdown(server, pool, 20);

    expect(await pending).toBe('cortada');
    expect(pool.end).toHaveBeenCalledOnce();
  });

  it('encerra ao receber SIGTERM e sai com código 0', async () => {
    const server = createServer((_req, res) => res.end('ok'));
    await listen(server);
    const pool = { end: vi.fn(async () => undefined) };
    const exited = new Promise<number>((resolve) => closeOnSignal(server, pool, resolve));

    process.emit('SIGTERM');
    process.emit('SIGTERM');

    expect(await exited).toBe(0);
    expect(pool.end).toHaveBeenCalledOnce();
    process.removeAllListeners('SIGINT');
  });
});
