import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../src/http/errors.js';

describe('errorHandler', () => {
  it('responde 500 sem expor detalhes de erros inesperados', () => {
    const json = vi.fn();
    const res = { status: vi.fn(() => ({ json })) } as unknown as Response;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(new Error('detalhe interno do banco'), {} as Request, res, () => {});

    expect(res.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: { code: 'internal_error', message: 'Erro interno.' } });
  });
});
