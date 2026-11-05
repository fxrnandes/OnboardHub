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

export type CsvValue = string | number | boolean | Date | null | undefined;

function textOf(value: CsvValue): string {
  if (value == null) return '';
  if (value instanceof Date) return formatDateTime(value);
  return String(value);
}

export function csvCell(value: CsvValue): string {
  const text = textOf(value);
  const safe = FORMULA_START.test(text) ? `'${text}` : text;
  return /[";\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function toCsv(header: string[], rows: CsvValue[][]): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(';'));
  return `﻿${lines.join('\r\n')}\r\n`;
}
