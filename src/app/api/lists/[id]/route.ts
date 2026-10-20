export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const watchlistId = parseInt(params.id, 10);
  if (isNaN(watchlistId)) {
    return NextResponse.json({ error: 'Invalid watchlist ID' }, { status: 400 });
  }

  try {
    const listSql = `
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
        u.avatar_url AS owner_avatar_url
      FROM watchlists w
      JOIN users u ON w.user_id = u.user_id
      WHERE w.watchlist_id = $1;
    `;
    const listRes = await query(listSql, [watchlistId]);

    if (listRes.rows.length === 0) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    const itemsSql = `
      SELECT 
        m.movie_id,
        m.title,
        m.poster_url,
        m.backdrop_url,
        m.release_date,
        m.avg_rating,
        m.review_count,
        m.runtime,
        wi.added_at,
        wi.notes
      FROM watchlist_items wi
      JOIN movies m ON wi.movie_id = m.movie_id
      WHERE wi.watchlist_id = $1
      ORDER BY wi.added_at DESC;
    `;
    const itemsRes = await query(itemsSql, [watchlistId]);

    return NextResponse.json({
      list: listRes.rows[0],
      movies: itemsRes.rows,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { getAuthenticatedUser } from '@/lib/auth';
import { withTransaction } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const watchlistId = parseInt(params.id, 10);
  if (isNaN(watchlistId)) {
    return NextResponse.json({ error: 'Invalid watchlist ID' }, { status: 400 });
  }

  try {
    const authUser = await getAuthenticatedUser(request);
    const body = await request.json();
    const { movieId, action } = body; // action: 'add' or 'remove'

    const effectiveUserId = authUser?.user_id || (body.userId ? parseInt(body.userId, 10) : null);

    if (!effectiveUserId) {
      return NextResponse.json(
        { error: 'Authentication required to modify watchlists' },
        { status: 401 }
      );
    }

    if (!movieId) {
      return NextResponse.json({ error: 'Missing movieId' }, { status: 400 });
    }

    const parsedMovieId = parseInt(movieId, 10);
    if (isNaN(parsedMovieId)) {
      return NextResponse.json({ error: 'Invalid movieId' }, { status: 400 });
    }

    // Verify ownership of the list
    const ownerRes = await query(
      `SELECT user_id FROM watchlists WHERE watchlist_id = $1;`,
      [watchlistId]
    );

    if (ownerRes.rows.length === 0) {
      return NextResponse.json({ error: 'Watchlist not found' }, { status: 404 });
    }

    if (ownerRes.rows[0].user_id !== effectiveUserId) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not own this watchlist' },
        { status: 403 }
      );
    }

    if (action === 'remove') {
      await query(
        `DELETE FROM watchlist_items WHERE watchlist_id = $1 AND movie_id = $2;`,
        [watchlistId, parsedMovieId]
      );
      return NextResponse.json({ success: true, action: 'removed' });
    } else {
      await query(
        `INSERT INTO watchlist_items (watchlist_id, movie_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
        [watchlistId, parsedMovieId]
      );
      return NextResponse.json({ success: true, action: 'added' });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const watchlistId = parseInt(params.id, 10);
  if (isNaN(watchlistId)) {
    return NextResponse.json({ error: 'Invalid watchlist ID' }, { status: 400 });
  }

  try {
    const authUser = await getAuthenticatedUser(request);
    let effectiveUserId = authUser?.user_id;

    // Check for optional movieId in URL query params or body
    const { searchParams } = new URL(request.url);
    let targetMovieId = searchParams.get('movieId');

    if (!effectiveUserId || !targetMovieId) {
      try {
        const body = await request.json();
        if (!effectiveUserId && body?.userId) {
          effectiveUserId = parseInt(body.userId, 10);
        }
        if (!targetMovieId && body?.movieId) {
          targetMovieId = String(body.movieId);
        }
      } catch {
        // No body provided
      }
    }

    if (!effectiveUserId) {
      return NextResponse.json(
        { error: 'Authentication required to modify or delete watchlists' },
        { status: 401 }
      );
    }

    // Verify ownership
    const listRes = await query(
      `SELECT user_id, name FROM watchlists WHERE watchlist_id = $1;`,
      [watchlistId]
    );

    if (listRes.rows.length === 0) {
      return NextResponse.json({ error: 'Watchlist not found' }, { status: 404 });
    }

    if (listRes.rows[0].user_id !== effectiveUserId) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not own this watchlist' },
        { status: 403 }
      );
    }

    // Case A: Remove a single movie item from watchlist
    if (targetMovieId) {
      const parsedMovieId = parseInt(targetMovieId, 10);
      await query(
        `DELETE FROM watchlist_items WHERE watchlist_id = $1 AND movie_id = $2;`,
        [watchlistId, parsedMovieId]
      );
      return NextResponse.json({ success: true, action: 'removed', movieId: parsedMovieId });
    }

    // Case B: Delete entire watchlist atomically
    await withTransaction(async (client) => {
      await client.query(`DELETE FROM watchlist_items WHERE watchlist_id = $1;`, [watchlistId]);
      await client.query(`DELETE FROM activity_logs WHERE activity_type = 'CREATE_LIST' AND target_id = $1;`, [watchlistId]);
      await client.query(`DELETE FROM watchlists WHERE watchlist_id = $1;`, [watchlistId]);
    });

    return NextResponse.json({
      success: true,
      message: `Watchlist "${listRes.rows[0].name}" deleted successfully`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
