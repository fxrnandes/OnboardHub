import pg from 'pg';

export type Queryable = Pick<pg.Pool | pg.PoolClient, 'query'>;

export function createPool(connectionString: string): pg.Pool {
  return new pg.Pool({ connectionString, max: 10 });
}
