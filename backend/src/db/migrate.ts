import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type pg from 'pg';

export async function migrate(pool: pg.Pool, migrationsDir: string): Promise<string[]> {
  await pool.query(`
    create table if not exists schema_migrations (
      name       text primary key,
      applied_at timestamptz not null default now()
    )`);

  const { rows } = await pool.query<{ name: string }>('select name from schema_migrations');
  const alreadyApplied = new Set(rows.map((row) => row.name));

  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
  const applied: string[] = [];

  for (const file of files) {
    if (alreadyApplied.has(file)) continue;

    const sql = await readFile(join(migrationsDir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into schema_migrations (name) values ($1)', [file]);
      await client.query('commit');
      applied.push(file);
    } catch (error) {
      await client.query('rollback');
      throw new Error(`Falha ao aplicar a migração ${file}: ${(error as Error).message}`);
    } finally {
      client.release();
    }
  }

  return applied;
}
