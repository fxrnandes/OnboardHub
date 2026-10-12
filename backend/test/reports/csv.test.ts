import { describe, expect, it } from 'vitest';
import { csvCell, toCsv } from '../../src/modules/reports/csv.js';

describe('CSV', () => {
  it('usa ponto e vírgula e começa com BOM para o Excel abrir acentos certo', () => {
    const csv = toCsv(['Nome', 'Cargo'], [['João', 'Caixa']]);

    expect(csv).toBe('﻿Nome;Cargo\r\nJoão;Caixa\r\n');
  });

  it('protege células com ponto e vírgula, aspas e quebra de linha', () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('diz "oi"')).toBe('"diz ""oi"""');
    expect(csvCell('linha\nnova')).toBe('"linha\nnova"');
  });

  it('impede que um nome vire fórmula ao abrir no Excel', () => {
    expect(csvCell('=SOMA(A1:A9)')).toBe("'=SOMA(A1:A9)");
    expect(csvCell('+5511999999999')).toBe("'+5511999999999");
  });

  it('deixa vazio o que não tem valor e formata datas', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(new Date('2026-10-12T15:00:00.000Z'))).toBe('2026-10-12T15:00:00.000Z');
  });
});
