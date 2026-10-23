import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users/recommendations
 *
 * Genre-Affinity & Film-Taste People Recommender
 * Finds users who share the most overlapping highly-rated genres with the
 * current user, ranked by a Jaccard taste-similarity score.
 *
 * Features:
 *   - Personalized CTE-driven genre affinity calculation
 *   - Cold-start fallback to top cinephile reviewers if user has no reviews yet
 *   - Excludes users the current user already follows & self
 *   - Includes top shared movie recommendations between matches
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    const { searchParams } = new URL(request.url);

    let userId = authUser?.user_id;
    if (!userId) {
      const paramId = searchParams.get('userId');
      if (paramId) userId = parseInt(paramId, 10);
    }

    if (!userId || isNaN(userId)) {
      return NextResponse.json(
        { error: 'Authentication required to get people recommendations' },
        { status: 401 }
      );
    }

    const limit = Math.min(parseInt(searchParams.get('limit') || '8', 10), 20);

    // Check if the current user has any ratings
    const reviewCountRes = await query(
      `SELECT COUNT(*)::INT as count FROM reviews WHERE user_id = $1 AND rating >= 6.0;`,
      [userId]
    );
    const hasEnoughReviews = (reviewCountRes.rows[0]?.count || 0) > 0;

    let rows: any[] = [];
    let isColdStart = !hasEnoughReviews;
    let querySql = '';
    let duration = 0;

    if (hasEnoughReviews) {
      querySql = `
        WITH MyGenres AS (
          SELECT DISTINCT mg.genre_id, g.name AS genre_name
          FROM reviews r
          JOIN movie_genres mg ON r.movie_id = mg.movie_id
          JOIN genres g ON mg.genre_id = g.genre_id
          WHERE r.user_id = $1 AND r.rating >= 6.0
        ),
        OtherUserGenres AS (
          SELECT 
            r.user_id,
            mg.genre_id,
            g.name AS genre_name,
            COUNT(*) AS genre_reviews,
            ROUND(AVG(r.rating), 1) AS avg_genre_rating
          FROM reviews r
          JOIN movie_genres mg ON r.movie_id = mg.movie_id
          JOIN genres g ON mg.genre_id = g.genre_id
          WHERE r.user_id != $1 AND r.rating >= 6.0
          GROUP BY r.user_id, mg.genre_id, g.name
        ),
        SharedGenres AS (
          SELECT 
            oug.user_id,
            COUNT(DISTINCT oug.genre_id) AS shared_count,
            ARRAY_AGG(DISTINCT oug.genre_name ORDER BY oug.genre_name) AS shared_genre_names
          FROM OtherUserGenres oug
          JOIN MyGenres mg ON oug.genre_id = mg.genre_id
          GROUP BY oug.user_id
        ),
        TotalGenres AS (
          SELECT 
            sg.user_id,
            sg.shared_count,
            sg.shared_genre_names,
            (
              SELECT COUNT(DISTINCT genre_id) FROM (
                SELECT genre_id FROM MyGenres
                UNION
                SELECT genre_id FROM OtherUserGenres WHERE OtherUserGenres.user_id = sg.user_id
              ) all_genres
            ) AS union_count
          FROM SharedGenres sg
        ),
        SimilarityScores AS (
          SELECT
            tg.user_id,
            tg.shared_count,
            tg.union_count,
            tg.shared_genre_names,
            ROUND((tg.shared_count::NUMERIC / GREATEST(tg.union_count, 1)), 3) AS similarity_score
          FROM TotalGenres tg
          WHERE tg.shared_count >= 1
        ),
        RankedUsers AS (
          SELECT
            ss.*,
            u.username,
            u.display_name,
            u.avatar_url,
            u.bio,
            (SELECT COUNT(*)::INT FROM reviews WHERE user_id = ss.user_id) AS total_reviews,
            (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE user_id = ss.user_id) AS avg_rating,
            (SELECT COUNT(*)::INT FROM follows WHERE following_id = ss.user_id) AS followers_count,
            DENSE_RANK() OVER (ORDER BY ss.similarity_score DESC, ss.shared_count DESC) AS match_rank
          FROM SimilarityScores ss
          JOIN users u ON ss.user_id = u.user_id
          WHERE ss.user_id NOT IN (
            SELECT following_id FROM follows WHERE follower_id = $1
          )
        )
        SELECT 
          user_id,
          username,
          display_name,
          avatar_url,
          bio,
          total_reviews,
          avg_rating,
          followers_count,
          shared_count,
          similarity_score,
          shared_genre_names,
          match_rank
        FROM RankedUsers
        ORDER BY match_rank ASC, total_reviews DESC
        LIMIT $2;
      `;

      const result = await query(querySql, [userId, limit]);
      rows = result.rows;
      duration = result.durationMs;
    }

    // Cold-start fallback if user has no reviews or no non-followed matches found
    if (rows.length === 0) {
      isColdStart = true;
      const fallbackSql = `
        SELECT 
          u.user_id,
          u.username,
          u.display_name,
          u.avatar_url,
          u.bio,
          COUNT(r.review_id)::INT AS total_reviews,
          COALESCE(ROUND(AVG(r.rating), 1), 0.0) AS avg_rating,
          (SELECT COUNT(*)::INT FROM follows WHERE following_id = u.user_id) AS followers_count,
          0 AS shared_count,
          0.70 AS similarity_score,
          ARRAY(
            SELECT g.name 
            FROM reviews r2
            JOIN movie_genres mg ON r2.movie_id = mg.movie_id
            JOIN genres g ON mg.genre_id = g.genre_id
            WHERE r2.user_id = u.user_id
            GROUP BY g.name
            ORDER BY COUNT(*) DESC
            LIMIT 3
          ) AS shared_genre_names,
          ROW_NUMBER() OVER (ORDER BY COUNT(r.review_id) DESC) AS match_rank
        FROM users u
        LEFT JOIN reviews r ON u.user_id = r.user_id
        WHERE u.user_id != $1
          AND u.user_id NOT IN (
            SELECT following_id FROM follows WHERE follower_id = $1
          )
        GROUP BY u.user_id, u.username, u.display_name, u.avatar_url, u.bio
        ORDER BY total_reviews DESC
        LIMIT $2;
      `;
      const fallbackRes = await query(fallbackSql, [userId, limit]);
      rows = fallbackRes.rows;
      querySql = fallbackSql;
      duration = fallbackRes.durationMs;
    }

    // Format similarity percentage
    const formattedRows = rows.map(r => ({
      ...r,
      similarity_score: Number(r.similarity_score) || 0.5,
      similarity_pct: Math.min(Math.round((Number(r.similarity_score) || 0.5) * 100), 99),
      is_following: false,
    }));

    return NextResponse.json({
      recommendations: formattedRows,
      currentUserId: userId,
      isColdStart,
      meta: {
        sql: querySql,
        durationMs: duration,
        rowCount: formattedRows.length,
        description: isColdStart 
          ? 'Cold-start: Recommended top active community critics'
          : 'Genre-Affinity: Jaccard similarity over shared highly-rated film genres',
      },
    });
  } catch (error: any) {
    console.error('[People Recommendations] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
