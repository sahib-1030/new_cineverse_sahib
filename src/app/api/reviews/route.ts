export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const movieId = searchParams.get('movieId');
  const userId = searchParams.get('userId');
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  const conditions: string[] = ['1=1'];
  const params: any[] = [];
  let paramIdx = 1;

  if (movieId) {
    conditions.push(`r.movie_id = $${paramIdx++}`);
    params.push(parseInt(movieId, 10));
  }

  if (userId) {
    conditions.push(`r.user_id = $${paramIdx++}`);
    params.push(parseInt(userId, 10));
  }

  const sql = `
    SELECT 
      r.review_id,
      r.user_id,
      r.movie_id,
      r.rating,
      r.review_text,
      r.has_spoilers,
      r.likes_count,
      r.created_at,
      r.updated_at,
      u.username,
      u.display_name,
      u.avatar_url,
      m.title AS movie_title,
      m.poster_url AS poster_url
    FROM reviews r
    JOIN users u ON r.user_id = u.user_id
    JOIN movies m ON r.movie_id = m.movie_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY r.created_at DESC
    LIMIT ${limit};
  `;

  try {
    const result = await query(sql, params);
    return NextResponse.json({
      reviews: result.rows,
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

import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required to rate or review a film' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { movieId, rating, reviewText, hasSpoilers, containsSpoilers } = body;
    const effectiveUserId = authUser.user_id;

    const parsedMovieId = parseInt(movieId, 10);
    if (isNaN(parsedMovieId)) {
      return NextResponse.json(
        { error: 'Valid movieId is required' },
        { status: 400 }
      );
    }

    if (rating === undefined || rating === null) {
      return NextResponse.json(
        { error: 'Rating is required' },
        { status: 400 }
      );
    }

    const numRating = parseFloat(rating);
    if (isNaN(numRating) || numRating < 1.0 || numRating > 10.0) {
      return NextResponse.json(
        { error: 'Rating must be between 1.0 and 10.0' },
        { status: 400 }
      );
    }

    const cleanReviewText = typeof reviewText === 'string' ? reviewText.trim() : '';
    const cleanSpoilers = Boolean(hasSpoilers ?? containsSpoilers ?? false);

    // Perform authentic mutation with server-side CineTrace provenance tracking
    const { captureReviewTrace } = await import('@/lib/trace');
    const traceResult = await captureReviewTrace({
      userId: effectiveUserId,
      movieId: parsedMovieId,
      rating: numRating,
      reviewText: cleanReviewText,
      hasSpoilers: cleanSpoilers,
    });

    return NextResponse.json({
      success: true,
      review: traceResult.review,
      updatedMovie: traceResult.updatedMovie,
      traceId: traceResult.trace.trace_id,
      trace: traceResult.trace,
      triggerEffect: {
        triggerName: 'trg_update_movie_rating',
        newAvgRating: traceResult.updatedMovie?.avg_rating,
        newReviewCount: traceResult.updatedMovie?.review_count,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
