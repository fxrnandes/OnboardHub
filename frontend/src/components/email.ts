export function isEmail(value: string): boolean {
  if (/\s/.test(value)) return false;
  const parts = value.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts as [string, string];
  return local.length > 0 && domain.slice(1, -1).includes('.');
}
