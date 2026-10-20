export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  let sql = `
    SELECT 
      w.watchlist_id,
      w.user_id,
      w.name,
      w.description,
      w.is_public,
      w.likes_count,
      w.created_at,
      u.username AS owner_username,
      u.display_name AS owner_display_name,
      u.avatar_url AS owner_avatar_url,
      COUNT(wi.movie_id)::INT AS movie_count,
      COALESCE(
        json_agg(
          json_build_object(
            'movie_id', m.movie_id,
            'title', m.title,
            'poster_url', m.poster_url,
            'avg_rating', m.avg_rating
          )
        ) FILTER (WHERE m.movie_id IS NOT NULL), '[]'
      ) AS movies
    FROM watchlists w
    JOIN users u ON w.user_id = u.user_id
    LEFT JOIN watchlist_items wi ON w.watchlist_id = wi.watchlist_id
    LEFT JOIN movies m ON wi.movie_id = m.movie_id
  `;

  const params: any[] = [];
  if (userId) {
    sql += ` WHERE w.user_id = $1`;
    params.push(parseInt(userId, 10));
  } else {
    sql += ` WHERE w.is_public = TRUE`;
  }

  sql += `
    GROUP BY w.watchlist_id, u.user_id
    ORDER BY w.likes_count DESC, w.created_at DESC;
  `;

  try {
    const result = await query(sql, params);
    return NextResponse.json({
      lists: result.rows,
      meta: {
        sql: result.sql,
        durationMs: result.durationMs,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { getAuthenticatedUser } from '@/lib/auth';
import { withTransaction } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    const body = await request.json();
    const { name, description, isPublic, movieIds } = body;

    const effectiveUserId = authUser?.user_id || (body.userId ? parseInt(body.userId, 10) : null);

    if (!effectiveUserId) {
      return NextResponse.json(
        { error: 'Authentication required to create a list' },
        { status: 401 }
      );
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'List name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const trimmedDesc = typeof description === 'string' ? description.trim() : '';

    // Atomic transaction: create watchlist + insert items + record activity log
    const newList = await withTransaction(async (client) => {
      // 1. Insert watchlist
      const insertListSql = `
        INSERT INTO watchlists (user_id, name, description, is_public)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      const listRes = await client.query(insertListSql, [
        effectiveUserId,
        trimmedName,
        trimmedDesc,
        isPublic !== false,
      ]);
      const createdList = listRes.rows[0];

      // 2. Insert movie items if provided
      if (Array.isArray(movieIds) && movieIds.length > 0) {
        for (const mid of movieIds) {
          const parsedMid = parseInt(mid, 10);
          if (!isNaN(parsedMid)) {
            await client.query(
              `INSERT INTO watchlist_items (watchlist_id, movie_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
              [createdList.watchlist_id, parsedMid]
            );
          }
        }
      }

      // 3. Log activity
      await client.query(
        `INSERT INTO activity_logs (user_id, activity_type, target_id, metadata) VALUES ($1, 'CREATE_LIST', $2, $3);`,
        [
          effectiveUserId,
          createdList.watchlist_id,
          JSON.stringify({ list_name: trimmedName, movie_count: movieIds?.length || 0 }),
        ]
      );

      return createdList;
    });

    return NextResponse.json({ success: true, list: newList });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
