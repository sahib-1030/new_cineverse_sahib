import { Pool, PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';

// Global singleton to preserve database engine across HMR and concurrent requests
const globalForDb = globalThis as unknown as {
  pgPool?: Pool;
  initPromise?: Promise<void>;
};

export const DEFAULT_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/cineverse';
const EXPECTED_SCHEMA_VERSION = '1.1.0';

export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
}

/**
 * Get database client (Standard PostgreSQL Pool)
 */
export async function getDb() {
  if (!globalForDb.pgPool) {
    globalForDb.pgPool = new Pool({
      connectionString: getDatabaseUrl(),
      connectionTimeoutMillis: 5000,
      max: 20,
      idleTimeoutMillis: 30000,
    });
  }

  if (!globalForDb.initPromise) {
    globalForDb.initPromise = initExternalDatabase(globalForDb.pgPool);
  }
  await globalForDb.initPromise;

  return { type: 'postgres' as const, client: globalForDb.pgPool };
}

/**
 * Handles PostgreSQL initialization (safe check, installs schema & seed if app_meta is absent)
 */
async function initExternalDatabase(pool: Pool): Promise<void> {
  try {
    const metaRes = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'app_meta'
      );`
    );

    if (!metaRes.rows[0]?.exists) {
      console.log('⚡ [DBMS] PostgreSQL detected without app_meta. Applying schema & seeds...');
      const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
      const seedPath = path.join(process.cwd(), 'db', 'seed.sql');

      if (fs.existsSync(schemaPath) && fs.existsSync(seedPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        
        const client = await pool.connect();
        try {
          await client.query('BEGIN;');
          await client.query(schemaSql);
          await client.query(seedSql);
          await client.query('COMMIT;');
          console.log('✅ [DBMS] PostgreSQL schema and seeds installed successfully.');
        } catch (err) {
          await client.query('ROLLBACK;');
          throw err;
        } finally {
          client.release();
        }
      } else {
        console.warn('⚠️ [DBMS] db/schema.sql or db/seed.sql not found at runtime path.');
      }
    }
  } catch (error: any) {
    console.error('❌ [DBMS] PostgreSQL connection/initialization error:', error.message);
    throw error;
  }
}

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  durationMs: number;
  sql: string;
  params?: any[];
}

/**
 * Main Raw SQL query executor with millisecond performance profiling
 */
export async function query<T = any>(
  sqlText: string,
  params: any[] = []
): Promise<QueryResult<T>> {
  const start = performance.now();
  const db = await getDb();

  try {
    const res = await db.client.query<any>(sqlText, params);
    const rows: T[] = res.rows || [];
    const rowCount = res.rowCount ?? rows.length;
    const durationMs = Math.round((performance.now() - start) * 100) / 100;

    return {
      rows,
      rowCount,
      durationMs,
      sql: sqlText.trim(),
      params,
    };
  } catch (error: any) {
    console.error('SQL Execution Error:', {
      sql: sqlText,
      params,
      message: error.message,
    });
    throw error;
  }
}

/**
 * Multi-statement SQL script executor
 */
export async function execSql(sqlText: string): Promise<{ durationMs: number }> {
  const start = performance.now();
  const db = await getDb();
  await db.client.query(sqlText);
  const durationMs = Math.round((performance.now() - start) * 100) / 100;
  return { durationMs };
}

/**
 * Reusable Transaction Helper
 * Ensures all multi-step queries either all commit or all roll back.
 */
export async function withTransaction<T>(
  callback: (executor: {
    query: <R = any>(sql: string, params?: any[]) => Promise<QueryResult<R>>;
  }) => Promise<T>
): Promise<T> {
  const db = await getDb();
  const client = await (db.client as Pool).connect();
  try {
    await client.query('BEGIN;');
    const executor = {
      query: async <R = any>(sql: string, params: any[] = []): Promise<QueryResult<R>> => {
        const start = performance.now();
        const res = await (client.query as any)(sql, params);
        const durationMs = Math.round((performance.now() - start) * 100) / 100;
        return {
          rows: res.rows || [],
          rowCount: res.rowCount ?? res.rows.length,
          durationMs,
          sql,
          params,
        };
      },
    };
    const result = await callback(executor);
    await client.query('COMMIT;');
    return result;
  } catch (err) {
    await client.query('ROLLBACK;');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Development database reset command helper
 */
export async function resetDatabase(): Promise<{ success: boolean; message: string }> {
  const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
  const seedPath = path.join(process.cwd(), 'db', 'seed.sql');

  if (!fs.existsSync(schemaPath) || !fs.existsSync(seedPath)) {
    throw new Error('Missing schema.sql or seed.sql in db/ directory.');
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const seedSql = fs.readFileSync(seedPath, 'utf8');

  const db = await getDb();
  const client = await (db.client as Pool).connect();
  try {
    await client.query(schemaSql);
    await client.query(seedSql);
    return { success: true, message: 'Database cleanly reseeded with fresh PostgreSQL schema.' };
  } finally {
    client.release();
  }
}

export { prisma } from './prisma';
