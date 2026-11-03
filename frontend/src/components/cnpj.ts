export function maskCnpj(value: string): string {
  const chars = value.replace(/[^0-9a-z]/gi, '').toUpperCase().slice(0, 14);
  const parts = [chars.slice(0, 2), chars.slice(2, 5), chars.slice(5, 8), chars.slice(8, 12), chars.slice(12, 14)];
  let masked = parts[0]!;
  if (parts[1]) masked += `.${parts[1]}`;
  if (parts[2]) masked += `.${parts[2]}`;
  if (parts[3]) masked += `/${parts[3]}`;
  if (parts[4]) masked += `-${parts[4]}`;
  return masked;
}

const WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function checkDigit(base: string): number {
  const weights = WEIGHTS.slice(WEIGHTS.length - base.length);
  const sum = [...base].reduce((total, char, index) => total + (char.charCodeAt(0) - 48) * weights[index]!, 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCnpj(value: string): boolean {
  const cnpj = value.replace(/[^0-9a-z]/gi, '').toUpperCase();
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(cnpj) || /^(.)\1+$/.test(cnpj)) return false;
  const base = cnpj.slice(0, 12);
  const first = checkDigit(base);
  return cnpj.endsWith(`${first}${checkDigit(`${base}${first}`)}`);
}
