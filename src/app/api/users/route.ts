import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = `
      SELECT 
        user_id,
        username,
        display_name,
        avatar_url,
        total_reviews,
        total_likes_received,
        avg_rating_given,
        rank
      FROM v_user_leaderboard
      ORDER BY rank ASC;
    `;
    const result = await query(sql);

    return NextResponse.json({
      users: result.rows,
      meta: {
        sql: result.sql,
        durationMs: result.durationMs,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
