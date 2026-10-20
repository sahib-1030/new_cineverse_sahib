export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const filter = searchParams.get('filter') || 'all'; // 'all' or 'following'
  const limit = parseInt(searchParams.get('limit') || '30', 10);

  let sql = `
    SELECT 
      al.log_id,
      al.user_id,
      al.activity_type,
      al.target_id,
      al.metadata,
      al.created_at,
      u.username,
      u.display_name,
      u.avatar_url,
      m.title AS movie_title,
      m.poster_url AS movie_poster
    FROM activity_logs al
    JOIN users u ON al.user_id = u.user_id
    LEFT JOIN movies m ON (
      CASE 
        WHEN al.activity_type IN ('NEW_REVIEW', 'WATCHLIST_ADD') THEN al.target_id 
        ELSE (al.metadata->>'movie_id')::INT 
      END
    ) = m.movie_id
  `;

  const params: any[] = [];
  if (filter === 'following' && userId) {
    sql += ` WHERE al.user_id IN (
      SELECT following_id FROM follows WHERE follower_id = $1
    )`;
    params.push(parseInt(userId, 10));
  }

  sql += ` ORDER BY al.created_at DESC LIMIT ${limit};`;

  try {
    const result = await query(sql, params);
    return NextResponse.json({
      activities: result.rows,
      meta: {
        sql: result.sql,
        params: result.params,
        durationMs: result.durationMs,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
