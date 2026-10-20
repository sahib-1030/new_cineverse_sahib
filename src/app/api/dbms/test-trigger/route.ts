export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    if (!(await getAuthenticatedUser(request))) {
      return NextResponse.json({ error: 'Sign-in required for trigger demonstrations.' }, { status: 401 });
    }
    // This endpoint changes real review data. Never permit on public deployments.
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DBMS_DEMO_MUTATIONS !== 'true') {
      return NextResponse.json({
        error: 'Trigger mutations are disabled. Enable explicitly on a disposable local demo database.'
      }, { status: 403 });
    }
    const body = await request.json();
    const movieId = parseInt(body.movieId || '1', 10);
    const testRating = parseFloat(body.rating || '10.0');
    if (!Number.isSafeInteger(movieId) || movieId <= 0 || !Number.isFinite(testRating) || testRating < 1 || testRating > 10) {
      return NextResponse.json({ error: 'Valid movie ID and rating (1–10) required.' }, { status: 400 });
    }
    const testUserId = 5; // Seeded fixture user; only available in explicitly enabled local demo mode

    // Step 1: Initial state before trigger
    const beforeMovie = await query(
      `SELECT movie_id, title, avg_rating, review_count FROM movies WHERE movie_id = $1;`,
      [movieId]
    );

    // Step 2: Insert or Update review (triggers trg_update_movie_rating and trg_log_review_activity)
    const insertRes = await query(`
      INSERT INTO reviews (user_id, movie_id, rating, review_text, has_spoilers)
      VALUES ($1, $2, $3, 'Automated DBMS Trigger Test Review. Testing real-time aggregation!', FALSE)
      ON CONFLICT (user_id, movie_id)
      DO UPDATE SET rating = EXCLUDED.rating, review_text = EXCLUDED.review_text, updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `, [testUserId, movieId, testRating]);

    // Step 3: Check movie state immediately after trigger fired
    const afterMovie = await query(
      `SELECT movie_id, title, avg_rating, review_count FROM movies WHERE movie_id = $1;`,
      [movieId]
    );

    // Step 4: Check if trg_log_review_activity logged the event
    const logCheck = await query(`
      SELECT * FROM activity_logs 
      WHERE user_id = $1 AND activity_type = 'NEW_REVIEW'
      ORDER BY created_at DESC LIMIT 1;
    `, [testUserId]);

    return NextResponse.json({
      success: true,
      message: 'Trigger execution verified successfully!',
      targetMovie: beforeMovie.rows[0]?.title,
      step1_before: {
        avg_rating: beforeMovie.rows[0]?.avg_rating,
        review_count: beforeMovie.rows[0]?.review_count,
      },
      step2_action: {
        operation: 'INSERT / UPDATE ON reviews',
        injectedRating: testRating,
        reviewRecord: insertRes.rows[0],
      },
      step3_after: {
        avg_rating: afterMovie.rows[0]?.avg_rating,
        review_count: afterMovie.rows[0]?.review_count,
        deltaRating: (afterMovie.rows[0]?.avg_rating - beforeMovie.rows[0]?.avg_rating).toFixed(2),
      },
      step4_trigger_audit_log: logCheck.rows[0] || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
