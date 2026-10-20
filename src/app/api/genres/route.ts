import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = `
      SELECT 
        genre_id,
        genre_name AS name,
        slug,
        total_movies,
        total_reviews,
        avg_genre_rating
      FROM v_genre_performance
      ORDER BY total_movies DESC;
    `;
    const result = await query(sql);

    return NextResponse.json({
      genres: result.rows,
      meta: {
        sql: result.sql,
        durationMs: result.durationMs,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
