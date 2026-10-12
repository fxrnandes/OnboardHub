import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { migrate } from '../../src/db/migrate.js';
import { createTestPool } from '../support/db.js';

const pool = createTestPool();
afterAll(() => pool.end());

async function migrationsDir(files: Record<string, string>) {
  const dir = await mkdtemp(join(tmpdir(), 'migracoes-'));
  for (const [name, sql] of Object.entries(files)) await writeFile(join(dir, name), sql);
  return dir;
}

describe('migrate', () => {
  it('aplica as migrações pendentes em ordem e não repete as já aplicadas', async () => {
    const dir = await migrationsDir({
      'teste_b.sql': 'insert into teste_ordem values (2);',
      'teste_a.sql': 'create table teste_ordem (n int);',
    });

    expect(await migrate(pool, dir)).toEqual(['teste_a.sql', 'teste_b.sql']);
    expect(await migrate(pool, dir)).toEqual([]);

    const { rows } = await pool.query('select n from teste_ordem');
    expect(rows).toEqual([{ n: 2 }]);
  });

  it('desfaz a migração com erro e informa qual arquivo falhou', async () => {
    const dir = await migrationsDir({
      'teste_quebrada.sql': 'create table teste_meio_feita (n int); isso nao e sql;',
    });

    await expect(migrate(pool, dir)).rejects.toThrow('Falha ao aplicar a migração teste_quebrada.sql');

    const tabela = await pool.query("select to_regclass('teste_meio_feita') as existe");
    expect(tabela.rows[0].existe).toBeNull();
    const registro = await pool.query("select 1 from schema_migrations where name = 'teste_quebrada.sql'");
    expect(registro.rowCount).toBe(0);
  });

  it('ignora arquivos que não são .sql', async () => {
    const dir = await migrationsDir({ 'LEIAME.txt': 'não é migração' });
    expect(await migrate(pool, dir)).toEqual([]);
  });
});
