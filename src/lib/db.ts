import { PGlite } from '@electric-sql/pglite';
import { Pool, PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';

// Global singleton to preserve database engine across HMR and concurrent requests
const globalForDb = globalThis as unknown as {
  pglite?: PGlite;
  pgPool?: Pool;
  initPromise?: Promise<void>;
};

const useExternalPostgres = Boolean(process.env.DATABASE_URL);
const EXPECTED_SCHEMA_VERSION = '1.1.0';

/**
 * Get database client (Embedded PGlite or standard pg Pool)
 */
export async function getDb() {
  if (useExternalPostgres) {
    if (!globalForDb.pgPool) {
      globalForDb.pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
    }

    if (!globalForDb.initPromise) {
      globalForDb.initPromise = initExternalDatabase(globalForDb.pgPool);
    }
    await globalForDb.initPromise;

    return { type: 'postgres' as const, client: globalForDb.pgPool };
  }

  // Embedded PostgreSQL (PGlite) for frictionless zero-setup development
  const dbPath = path.join(process.cwd(), '.pglite_db');

  if (!globalForDb.pglite) {
    try {
      globalForDb.pglite = new PGlite(dbPath);
    } catch (err: any) {
      console.warn('⚠️ [DBMS] .pglite_db lock or corruption detected. Re-initializing...', err.message);
      if (fs.existsSync(dbPath)) {
        fs.rmSync(dbPath, { recursive: true, force: true });
      }
      globalForDb.pglite = new PGlite(dbPath);
    }
  }

  if (!globalForDb.initPromise) {
    globalForDb.initPromise = initLocalDatabase(globalForDb.pglite, dbPath);
  }

  try {
    await globalForDb.initPromise;
  } catch (initErr: any) {
    // Reset promise so subsequent requests don't hang on a failed initialization
    globalForDb.initPromise = undefined;
    throw new Error(`[DBMS Startup Error] Database initialization failed: ${initErr.message}`);
  }

  return { type: 'pglite' as const, client: globalForDb.pglite };
}

/**
 * Ensures embedded PGlite is seeded and has current schema version
 */
async function initLocalDatabase(pglite: PGlite, dbPath: string): Promise<void> {
  try {
    // Check if app_meta table exists and read schema_version
    let isInitialized = false;
    try {
      const metaRes = await pglite.query<{ value: string }>(
        `SELECT value FROM app_meta WHERE key = 'schema_version' LIMIT 1;`
      );
      if (metaRes.rows.length > 0 && metaRes.rows[0].value === EXPECTED_SCHEMA_VERSION) {
        isInitialized = true;
      }
    } catch {
      // Table doesn't exist yet -> brand new DB
      isInitialized = false;
    }

    if (!isInitialized) {
      console.log('⚡ [DBMS] Initializing fresh CineVerse PostgreSQL database...');
      await runSchemaAndSeed(pglite);
      console.log('✅ [DBMS] Local database initialized with 12 tables, triggers, and seed data.');
    }
  } catch (error: any) {
    console.error('❌ [DBMS] Fatal error initializing local database:', error);
    // Auto-clean corrupted state
    try {
      if (fs.existsSync(dbPath)) {
        fs.rmSync(dbPath, { recursive: true, force: true });
      }
    } catch {}
    throw error;
  }
}

/**
 * Handles external PostgreSQL (safe check, never destructive auto-wiping)
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
      console.log('⚡ [DBMS] External PostgreSQL detected without app_meta. Applying schema & seeds...');
      const schemaSql = fs.readFileSync(path.join(process.cwd(), 'db', 'schema.sql'), 'utf8');
      const seedSql = fs.readFileSync(path.join(process.cwd(), 'db', 'seed.sql'), 'utf8');
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN;');
        await client.query(schemaSql);
        await client.query(seedSql);
        await client.query('COMMIT;');
        console.log('✅ [DBMS] External PostgreSQL schema and seeds installed successfully.');
      } catch (err) {
        await client.query('ROLLBACK;');
        throw err;
      } finally {
        client.release();
      }
    }
  } catch (error: any) {
    console.error('❌ [DBMS] External PostgreSQL connection/initialization error:', error.message);
    throw error;
  }
}

/**
 * Runs schema.sql followed by seed.sql atomically
 */
async function runSchemaAndSeed(pglite: PGlite): Promise<void> {
  const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
  const seedPath = path.join(process.cwd(), 'db', 'seed.sql');

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file missing at: ${schemaPath}`);
  }
  if (!fs.existsSync(seedPath)) {
    throw new Error(`Seed file missing at: ${seedPath}`);
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const seedSql = fs.readFileSync(seedPath, 'utf8');

  await pglite.exec(schemaSql);
  await pglite.exec(seedSql);
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
    let rows: T[] = [];
    let rowCount = 0;

    if (db.type === 'pglite') {
      const res = await db.client.query<T>(sqlText, params);
      rows = res.rows || [];
      rowCount = res.affectedRows ?? rows.length;
    } else {
      const res = await db.client.query<any>(sqlText, params);
      rows = res.rows || [];
      rowCount = res.rowCount ?? rows.length;
    }

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

  if (db.type === 'pglite') {
    await db.client.exec(sqlText);
  } else {
    await db.client.query(sqlText);
  }

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

  if (db.type === 'postgres') {
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
  } else {
    // PGlite in-process transaction
    const pglite = db.client as PGlite;
    await pglite.exec('BEGIN;');
    try {
      const executor = {
        query: async <R = any>(sql: string, params: any[] = []): Promise<QueryResult<R>> => {
          const start = performance.now();
          const res = await pglite.query<R>(sql, params);
          const durationMs = Math.round((performance.now() - start) * 100) / 100;
          return {
            rows: res.rows || [],
            rowCount: res.affectedRows ?? res.rows.length,
            durationMs,
            sql,
            params,
          };
        },
      };
      const result = await callback(executor);
      await pglite.exec('COMMIT;');
      return result;
    } catch (err) {
      await pglite.exec('ROLLBACK;');
      throw err;
    }
  }
}

/**
 * Development database reset command helper
 */
export async function resetDatabase(): Promise<{ success: boolean; message: string }> {
  if (useExternalPostgres) {
    throw new Error('Refusing to auto-reset external PostgreSQL database. Perform manual reset if needed.');
  }

  const dbPath = path.join(process.cwd(), '.pglite_db');
  console.log('🔄 [DBMS] Resetting local database...');

  // Nullify singleton
  globalForDb.pglite = undefined;
  globalForDb.initPromise = undefined;

  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath, { recursive: true, force: true });
  }

  // Recreate and run
  const freshDb = new PGlite(dbPath);
  await runSchemaAndSeed(freshDb);
  globalForDb.pglite = freshDb;

  return { success: true, message: 'Database cleanly reseeded with fresh PostgreSQL schema.' };
}

export { prisma } from './prisma';
