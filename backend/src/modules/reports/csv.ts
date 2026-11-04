const FORMULA_START = /^[=+\-@\t\r]/;

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export const formatDateTime = (date: Date) => dateTime.format(date).replace(', ', ' ');

export function csvCell(value: unknown): string {
  const text = value == null ? '' : value instanceof Date ? formatDateTime(value) : String(value);
  const safe = FORMULA_START.test(text) ? `'${text}` : text;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(';'));
  return `﻿${lines.join('\r\n')}\r\n`;
}
