import { api, ApiError, tokenStorage } from '../src/api/client';
import { mockFetch } from './support/fetch';

describe('api client', () => {
  it('prefixa /api, envia JSON e o token salvo', async () => {
    tokenStorage.set('abc');
    const { calls } = mockFetch({ 'POST /coisas': { status: 201, body: { ok: true } } });

    const result = await api.post<{ ok: boolean }>('/coisas', { nome: 'x' });

    expect(result).toEqual({ ok: true });
    expect(calls[0]).toMatchObject({
      method: 'POST',
      path: '/coisas',
      body: { nome: 'x' },
      headers: { Authorization: 'Bearer abc', 'Content-Type': 'application/json' },
    });
  });

  it('não envia Authorization sem token', async () => {
    const { calls } = mockFetch({ 'GET /coisas': { body: [] } });
    await api.get('/coisas');
    expect(calls[0]!.headers.Authorization).toBeUndefined();
  });

  it('retorna undefined em 204', async () => {
    mockFetch({ 'DELETE /coisas/1': { status: 204 } });
    await expect(api.delete('/coisas/1')).resolves.toBeUndefined();
  });

  it('converte o erro da API em ApiError com detalhes por campo', async () => {
    mockFetch({
      'POST /coisas': {
        status: 400,
        body: {
          error: {
            code: 'validation_error',
            message: 'Dados inválidos.',
            details: [{ field: 'email', message: 'E-mail inválido.' }],
          },
        },
      },
    });

    const error = await api.post('/coisas', {}).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: 'validation_error', message: 'Dados inválidos.' });
    expect((error as ApiError).fieldMessage('email')).toBe('E-mail inválido.');
    expect((error as ApiError).fieldMessage('senha')).toBeUndefined();
  });

  it('usa mensagem genérica quando a resposta não é JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>', { status: 502 })));
    await expect(api.get('/x')).rejects.toMatchObject({ status: 502, code: 'unknown_error' });
  });

  it('informa falha de rede', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(api.get('/x')).rejects.toMatchObject({ status: 0, code: 'network_error' });
  });
});
