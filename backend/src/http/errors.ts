import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: 'Dados inválidos.',
        details: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
      },
    });
    return;
  }

  if (error?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'invalid_json', message: 'O corpo da requisição não é um JSON válido.' } });
    return;
  }

  console.error(error);
  res.status(500).json({ error: { code: 'internal_error', message: 'Erro interno.' } });
};
