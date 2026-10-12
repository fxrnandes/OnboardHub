import { fileURLToPath } from 'node:url';
import pg from 'pg';
import type { TestProject } from 'vitest/node';
import { migrate } from '../../src/db/migrate.js';

export default async function setup(project: TestProject) {
  const baseUrl = process.env.DATABASE_URL ?? 'postgres://onboardhub:onboardhub@localhost:5432/onboardhub';
  const testUrl = new URL(baseUrl);
  const testDbName = `${testUrl.pathname.slice(1)}_test`;
  testUrl.pathname = `/${testDbName}`;

  const admin = new pg.Client({ connectionString: baseUrl });
  await admin.connect();
  await admin.query(`drop database if exists "${testDbName}" with (force)`);
  await admin.query(`create database "${testDbName}"`);
  await admin.end();

  const pool = new pg.Pool({ connectionString: testUrl.toString() });
  await migrate(pool, fileURLToPath(new URL('../../db/migrations', import.meta.url)));
  await pool.end();

  project.provide('testDatabaseUrl', testUrl.toString());
}

declare module 'vitest' {
  export interface ProvidedContext {
    testDatabaseUrl: string;
  }
}
