const WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const SHAPE = /^[\dA-Z]{12}\d{2}$/;

function checkDigit(base: string): number {
  const weights = WEIGHTS.slice(WEIGHTS.length - base.length);
  const sum = [...base].reduce((total, char, index) => total + (char.codePointAt(0)! - 48) * weights[index]!, 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function normalizeCnpj(value: string): string {
  return value.replace(/[^\da-z]/gi, '').toUpperCase();
}

export function isValidCnpj(cnpj: string): boolean {
  if (!SHAPE.test(cnpj) || /^(.)\1+$/.test(cnpj)) return false;
  const base = cnpj.slice(0, 12);
  const first = checkDigit(base);
  const second = checkDigit(`${base}${first}`);
  return cnpj.endsWith(`${first}${second}`);
}

export function formatCnpj(cnpj: string): string {
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
}
