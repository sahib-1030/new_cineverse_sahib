export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = parseInt(params.id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  try {
    const authUser = await getAuthenticatedUser(request);
    const isOwnProfile = authUser?.user_id === userId;

    // 1. Get User Profile
    const userSql = `
      SELECT 
        user_id,
        username,
        email,
        display_name,
        bio,
        avatar_url,
        banner_url,
        created_at
      FROM users
      WHERE user_id = $1;
    `;
    const userRes = await query(userSql, [userId]);

    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const profile = { ...userRes.rows[0] };
    if (!isOwnProfile) {
      delete profile.email;
    }

    // 2. Call PL/pgSQL Function: fn_get_user_analytics
    const analyticsSql = `SELECT fn_get_user_analytics($1) AS analytics;`;
    const analyticsRes = await query(analyticsSql, [userId]);

    // 3. Get User's Recent Reviews
    const reviewsSql = `
      SELECT 
        r.review_id,
        r.movie_id,
        r.rating,
        r.review_text,
        r.has_spoilers,
        r.likes_count,
        r.created_at,
        m.title AS movie_title,
        m.poster_url,
        m.backdrop_url,
        m.release_date
      FROM reviews r
      JOIN movies m ON r.movie_id = m.movie_id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC;
    `;
    const reviewsRes = await query(reviewsSql, [userId]);

    // 4. Personalized Recommendations using fn_recommend_movies
    const recsSql = `SELECT * FROM fn_recommend_movies($1, 4);`;
    let recommendations: any[] = [];
    try {
      const recsRes = await query(recsSql, [userId]);
      recommendations = recsRes.rows;
    } catch {
      // fallback if error
    }

    return NextResponse.json({
      user: profile,
      analytics: analyticsRes.rows[0]?.analytics || {},
      reviews: reviewsRes.rows,
      recommendations,
      meta: {
        sql: `SELECT fn_get_user_analytics(${userId});`,
        durationMs: userRes.durationMs + analyticsRes.durationMs + reviewsRes.durationMs,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
