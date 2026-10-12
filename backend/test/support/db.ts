import { inject } from 'vitest';
import { createPool } from '../../src/db/pool.js';

export const createTestPool = () => createPool(inject('testDatabaseUrl'));
