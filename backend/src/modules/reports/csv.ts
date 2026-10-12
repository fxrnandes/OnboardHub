const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  const text = value == null ? '' : value instanceof Date ? value.toISOString() : String(value);
  const safe = FORMULA_START.test(text) ? `'${text}` : text;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(';'));
  return `﻿${lines.join('\r\n')}\r\n`;
}
