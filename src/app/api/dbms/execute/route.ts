export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withTransaction } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * The interactive SQL console is a READ-ONLY teaching tool.
 * Mutations use dedicated, permission-checked application endpoints.
 * Even an authenticated user cannot opt into arbitrary SQL writes.
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Sign in to use the SQL workbench.' }, { status: 401 });
    }

    // Do not expose a general SQL console on public deployments unless deliberately enabled.
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DBMS_SQL_CONSOLE !== 'true') {
      return NextResponse.json({ error: 'SQL workbench disabled on this deployment.' }, { status: 403 });
    }

    const body = await request.json();
    if (body?.allowWrite === true) {
      return NextResponse.json({
        error: 'Arbitrary SQL writes are not supported. Use the dedicated application or Trigger Lab actions.'
      }, { status: 403 });
    }

    if (typeof body?.sql !== 'string' || !body.sql.trim() || body.sql.length > 20000) {
      return NextResponse.json({ error: 'A SQL statement of at most 20,000 characters is required.' }, { status: 400 });
    }

    // Only one SQL statement; reject interior semicolons (including those in literals,
    // conservatively). The readonly transaction is the actual security boundary.
    const statement = body.sql.trim().replace(/;\s*$/, '').trim();
    if (statement.includes(';') || !/^(SELECT|WITH|EXPLAIN)\b/i.test(statement)) {
      return NextResponse.json({ error: 'Only one read-only SELECT, WITH or EXPLAIN statement is allowed.' }, { status: 403 });
    }
    if (/\bANALYZE\b/i.test(statement)) {
      return NextResponse.json({ error: 'EXPLAIN ANALYZE is not allowed; use EXPLAIN without ANALYZE.' }, { status: 403 });
    }

    // PostgreSQL rejects data-changing CTEs, user-defined mutating functions and
    // SELECT INTO inside a READ ONLY transaction. Works for both pg and PGlite.
    const result = await withTransaction(async tx => {
      await tx.query('SET TRANSACTION READ ONLY;');
      return tx.query(statement);
    });

    return NextResponse.json({
      success: true,
      columns: result.rows.length ? Object.keys(result.rows[0]) : [],
      rows: result.rows,
      rowCount: result.rowCount,
      durationMs: result.durationMs,
      sql: statement,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Read-only SQL execution failed',
    }, { status: 400 });
  }
}
