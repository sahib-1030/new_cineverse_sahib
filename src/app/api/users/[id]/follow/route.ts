import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const targetUserId = parseInt(params.id, 10);
  if (isNaN(targetUserId)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  try {
    const authUser = await getAuthenticatedUser(request);
    let currentUserId = authUser?.user_id;

    if (!currentUserId) {
      try {
        const body = await request.json();
        if (body?.currentUserId) {
          currentUserId = parseInt(body.currentUserId, 10);
        }
      } catch {
        // body could be empty
      }
    }

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Authentication required to follow users' },
        { status: 401 }
      );
    }

    if (currentUserId === targetUserId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    // Check if following relationship exists
    const checkSql = `SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2;`;
    const checkRes = await query(checkSql, [currentUserId, targetUserId]);

    let isFollowing = false;
    if (checkRes.rows.length > 0) {
      // Unfollow
      await query(`DELETE FROM follows WHERE follower_id = $1 AND following_id = $2;`, [currentUserId, targetUserId]);
      isFollowing = false;
    } else {
      // Follow
      await query(`INSERT INTO follows (follower_id, following_id) VALUES ($1, $2);`, [currentUserId, targetUserId]);
      isFollowing = true;

      // Log follow activity
      await query(
        `INSERT INTO activity_logs (user_id, activity_type, target_id, metadata) VALUES ($1, 'FOLLOW', $2, $3);`,
        [currentUserId, targetUserId, JSON.stringify({ followed_user_id: targetUserId })]
      );
    }

    // Get fresh follower count
    const countRes = await query(
      `SELECT COUNT(*)::INT as followers_count FROM follows WHERE following_id = $1;`,
      [targetUserId]
    );

    return NextResponse.json({
      success: true,
      isFollowing,
      followersCount: countRes.rows[0]?.followers_count || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const targetUserId = parseInt(params.id, 10);
  if (isNaN(targetUserId)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const authUser = await getAuthenticatedUser(request);
  const currentUserId = authUser?.user_id || (searchParams.get('currentUserId') ? parseInt(searchParams.get('currentUserId')!, 10) : null);

  try {
    let isFollowing = false;
    if (currentUserId) {
      const checkRes = await query(
        `SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2;`,
        [currentUserId, targetUserId]
      );
      isFollowing = checkRes.rows.length > 0;
    }

    const countRes = await query(
      `SELECT COUNT(*)::INT as followers_count FROM follows WHERE following_id = $1;`,
      [targetUserId]
    );

    return NextResponse.json({
      isFollowing,
      followersCount: countRes.rows[0]?.followers_count || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
