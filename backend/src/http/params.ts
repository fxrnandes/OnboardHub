import { AppError } from './errors.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function idParam(value: string | string[] | undefined, what = 'Registro'): string {
  if (typeof value !== 'string' || !UUID.test(value)) {
    throw new AppError(404, 'not_found', `${what} não encontrado.`);
  }
  return value;
}
