import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const reviewId = parseInt(params.id, 10);
  if (isNaN(reviewId)) {
    return NextResponse.json({ error: 'Invalid review ID' }, { status: 400 });
  }

  try {
    const authUser = await getAuthenticatedUser(request);
    let userId = authUser?.user_id;

    if (!userId) {
      try {
        const body = await request.json();
        if (body?.userId) {
          userId = parseInt(body.userId, 10);
        }
      } catch {
        // body may be empty
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required to like reviews' },
        { status: 401 }
      );
    }

    // Check if like exists
    const checkSql = `SELECT 1 FROM review_likes WHERE user_id = $1 AND review_id = $2;`;
    const checkRes = await query(checkSql, [userId, reviewId]);

    let action = 'liked';
    if (checkRes.rows.length > 0) {
      // Unlike
      await query(`DELETE FROM review_likes WHERE user_id = $1 AND review_id = $2;`, [userId, reviewId]);
      action = 'unliked';
    } else {
      // Like
      await query(`INSERT INTO review_likes (user_id, review_id) VALUES ($1, $2);`, [userId, reviewId]);
      action = 'liked';
    }

    // Trigger trg_update_review_likes updates review.likes_count automatically
    const updatedReview = await query(
      `SELECT review_id, likes_count FROM reviews WHERE review_id = $1;`,
      [reviewId]
    );

    return NextResponse.json({
      success: true,
      action,
      likesCount: updatedReview.rows[0]?.likes_count ?? 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
