import { query } from '@/lib/db';
import {
  UserReviewRecord,
  ContrastPair,
  OpposingCriticCandidate,
  EvidenceRecord,
} from './types';

/**
 * 1. Retrieve the user's authentic review and rating history
 */
export async function getMyReviewHistory(
  userId: number,
  limit: number = 30
): Promise<UserReviewRecord[]> {
  const sql = `
    SELECT 
      r.review_id,
      r.movie_id,
      m.title,
      COALESCE(m.poster_url, '') AS poster_url,
      COALESCE(m.backdrop_url, '') AS backdrop_url,
      COALESCE(m.director, 'Unknown') AS director,
      TO_CHAR(m.release_date, 'YYYY-MM-DD') AS release_date,
      COALESCE(m.runtime, 120) AS runtime,
      COALESCE(m.overview, '') AS synopsis,
      r.rating::float AS rating,
      COALESCE(r.review_text, '') AS review_text,
      r.has_spoilers,
      r.created_at::text AS created_at,
      COALESCE(array_agg(g.name) FILTER (WHERE g.name IS NOT NULL), '{}') AS genres
    FROM reviews r
    JOIN movies m ON r.movie_id = m.movie_id
    LEFT JOIN movie_genres mg ON m.movie_id = mg.movie_id
    LEFT JOIN genres g ON mg.genre_id = g.genre_id
    WHERE r.user_id = $1
    GROUP BY r.review_id, r.movie_id, m.title, m.poster_url, m.backdrop_url,
             m.director, m.release_date, m.runtime, m.overview, r.rating,
             r.review_text, r.has_spoilers, r.created_at
    ORDER BY r.created_at DESC
    LIMIT $2;
  `;

  const res = await query<any>(sql, [userId, limit]);
  return res.rows.map((row) => ({
    ...row,
    review_text: row.has_spoilers ? '[Spoiler withheld from AI investigation]' : row.review_text,
    rating: Number(row.rating),
  }));
}

/**
 * 2. Find pairs of films reviewed by the user that share a genre but have sharply contrasting ratings
 */
export async function findMyContrastPairs(userId: number): Promise<ContrastPair[]> {
  const sql = `
    WITH user_films AS (
      SELECT 
        r.review_id,
        r.movie_id,
        m.title,
        COALESCE(m.poster_url, '') AS poster_url,
        COALESCE(m.backdrop_url, '') AS backdrop_url,
        COALESCE(m.director, 'Unknown') AS director,
        TO_CHAR(m.release_date, 'YYYY-MM-DD') AS release_date,
        COALESCE(m.runtime, 120) AS runtime,
        COALESCE(m.overview, '') AS synopsis,
        r.rating::float AS rating,
        COALESCE(r.review_text, '') AS review_text,
        r.has_spoilers,
        r.created_at::text AS created_at,
        COALESCE(array_agg(g.name) FILTER (WHERE g.name IS NOT NULL), '{}') AS genres
      FROM reviews r
      JOIN movies m ON r.movie_id = m.movie_id
      LEFT JOIN movie_genres mg ON m.movie_id = mg.movie_id
      LEFT JOIN genres g ON mg.genre_id = g.genre_id
      WHERE r.user_id = $1
      GROUP BY r.review_id, r.movie_id, m.title, m.poster_url, m.backdrop_url,
               m.director, m.release_date, m.runtime, m.overview, r.rating,
               r.review_text, r.has_spoilers, r.created_at
    )
    SELECT 
      f1.review_id AS high_review_id,
      f1.movie_id AS high_movie_id,
      f1.title AS high_title,
      f1.poster_url AS high_poster_url,
      f1.backdrop_url AS high_backdrop_url,
      f1.director AS high_director,
      f1.release_date AS high_release_date,
      f1.runtime AS high_runtime,
      f1.synopsis AS high_synopsis,
      f1.rating AS high_rating,
      f1.review_text AS high_review_text,
      f1.has_spoilers AS high_has_spoilers,
      f1.created_at AS high_created_at,
      f1.genres AS high_genres,

      f2.review_id AS low_review_id,
      f2.movie_id AS low_movie_id,
      f2.title AS low_title,
      f2.poster_url AS low_poster_url,
      f2.backdrop_url AS low_backdrop_url,
      f2.director AS low_director,
      f2.release_date AS low_release_date,
      f2.runtime AS low_runtime,
      f2.synopsis AS low_synopsis,
      f2.rating AS low_rating,
      f2.review_text AS low_review_text,
      f2.has_spoilers AS low_has_spoilers,
      f2.created_at AS low_created_at,
      f2.genres AS low_genres,

      ROUND((f1.rating - f2.rating)::numeric, 1)::float AS rating_diff
    FROM user_films f1
    JOIN user_films f2 ON f1.movie_id != f2.movie_id AND f1.rating >= f2.rating + 2.5
    WHERE f1.genres && f2.genres
    ORDER BY rating_diff DESC
    LIMIT 10;
  `;

  const res = await query<any>(sql, [userId]);
  return res.rows.map((row) => {
    // Find intersection of genres
    const shared = row.high_genres.filter((g: string) => row.low_genres.includes(g));
    return {
      highMovie: {
        review_id: row.high_review_id,
        movie_id: row.high_movie_id,
        title: row.high_title,
        poster_url: row.high_poster_url,
        backdrop_url: row.high_backdrop_url,
        director: row.high_director,
        release_date: row.high_release_date,
        runtime: row.high_runtime,
        synopsis: row.high_synopsis,
        rating: Number(row.high_rating),
        review_text: row.high_has_spoilers ? '[Spoiler withheld from AI investigation]' : row.high_review_text,
        has_spoilers: row.high_has_spoilers,
        created_at: row.high_created_at,
        genres: row.high_genres,
      },
      lowMovie: {
        review_id: row.low_review_id,
        movie_id: row.low_movie_id,
        title: row.low_title,
        poster_url: row.low_poster_url,
        backdrop_url: row.low_backdrop_url,
        director: row.low_director,
        release_date: row.low_release_date,
        runtime: row.low_runtime,
        synopsis: row.low_synopsis,
        rating: Number(row.low_rating),
        review_text: row.low_has_spoilers ? '[Spoiler withheld from AI investigation]' : row.low_review_text,
        has_spoilers: row.low_has_spoilers,
        created_at: row.low_created_at,
        genres: row.low_genres,
      },
      sharedGenres: shared,
      ratingDifference: Number(row.rating_diff),
    };
  });
}

/**
 * 3. Find an opposing critic for a target movie:
 * High historical agreement on OTHER films (excluding target), but stark disagreement on target movie.
 */
export async function findOpposingCritics(
  userId: number,
  movieId: number
): Promise<OpposingCriticCandidate | null> {
  // Check if target movie was rated by user
  const targetSql = `
    SELECT r.rating::float AS rating, r.review_id, r.review_text, r.has_spoilers, m.title
    FROM reviews r
    JOIN movies m ON r.movie_id = m.movie_id
    WHERE r.user_id = $1 AND r.movie_id = $2;
  `;
  const userTargetRes = await query<any>(targetSql, [userId, movieId]);
  if (userTargetRes.rows.length === 0) {
    return null;
  }
  const userTarget = userTargetRes.rows[0];

  // Find candidate critics who rated target film, excluding target film from similarity denominator
  const candidatesSql = `
    WITH other_critics AS (
      SELECT 
        r.user_id,
        r.rating::float AS critic_target_rating,
        r.review_id AS critic_review_id,
        COALESCE(r.review_text, '') AS critic_review_text,
        r.has_spoilers AS critic_spoilers,
        u.username,
        u.display_name,
        COALESCE(u.avatar_url, '') AS avatar_url
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.movie_id = $2 AND r.user_id != $1
    ),
    shared_history AS (
      SELECT 
        oc.user_id AS critic_id,
        COUNT(r_other.movie_id)::int AS shared_count,
        AVG(ABS(r_user.rating - r_other.rating))::float AS mean_abs_diff
      FROM other_critics oc
      JOIN reviews r_other ON oc.user_id = r_other.user_id AND r_other.movie_id != $2
      JOIN reviews r_user ON r_user.user_id = $1 AND r_user.movie_id = r_other.movie_id AND r_user.movie_id != $2
      GROUP BY oc.user_id
    )
    SELECT 
      oc.*,
      COALESCE(sh.shared_count, 0) AS shared_count,
      ROUND(
        GREATEST(0, LEAST(100, 100.0 * (1.0 - (COALESCE(sh.mean_abs_diff, 9.0) / 9.0))))::numeric,
        1
      )::float AS agreement_pct,
      ROUND(ABS($3 - oc.critic_target_rating)::numeric, 1)::float AS target_divergence
    FROM other_critics oc
    LEFT JOIN shared_history sh ON oc.user_id = sh.critic_id
    ORDER BY 
      (COALESCE(sh.shared_count, 0) >= 3) DESC,
      target_divergence DESC,
      shared_count DESC
    LIMIT 1;
  `;

  const candidatesRes = await query<any>(candidatesSql, [userId, movieId, userTarget.rating]);
  if (candidatesRes.rows.length === 0) {
    return null;
  }

  const best = candidatesRes.rows[0];
  // Enforce minimum threshold of >= 3 shared films and meaningful divergence (>= 3.0 points)
  if (!best.shared_count || Number(best.shared_count) < 3 || !best.target_divergence || Number(best.target_divergence) < 3.0) {
    return null;
  }

  // Fetch the shared movies and both ratings
  const sharedMoviesSql = `
    SELECT 
      m.movie_id,
      m.title,
      r_user.rating::float AS user_rating,
      r_critic.rating::float AS critic_rating
    FROM reviews r_user
    JOIN reviews r_critic ON r_user.movie_id = r_critic.movie_id AND r_critic.user_id = $2
    JOIN movies m ON r_user.movie_id = m.movie_id
    WHERE r_user.user_id = $1 AND r_user.movie_id != $3
    ORDER BY r_user.created_at DESC;
  `;
  const sharedRes = await query<any>(sharedMoviesSql, [userId, best.user_id, movieId]);

  return {
    critic: {
      userId: best.user_id,
      username: best.username,
      displayName: best.display_name,
      avatarUrl: best.avatar_url,
    },
    sharedFilmCount: best.shared_count,
    agreementPercentage: Number(best.agreement_pct),
    targetMovieId: movieId,
    targetMovieTitle: userTarget.title,
    userRating: Number(userTarget.rating),
    criticRating: Number(best.critic_target_rating),
    ratingDifference: Number(best.target_divergence),
    userReview: {
      reviewId: userTarget.review_id,
      text: userTarget.has_spoilers ? '[Spoiler withheld from AI investigation]' : userTarget.review_text,
      hasSpoilers: userTarget.has_spoilers,
    },
    criticReview: {
      reviewId: best.critic_review_id,
      text: best.critic_spoilers ? '[Spoiler withheld from AI investigation]' : best.critic_review_text,
      hasSpoilers: best.critic_spoilers,
    },
    sharedReviews: sharedRes.rows.map((r) => ({
      movieId: r.movie_id,
      title: r.title,
      userRating: Number(r.user_rating),
      criticRating: Number(r.critic_rating),
    })),
  };
}

/**
 * 4. Retrieve public review records for evidence citations
 */
export async function getPublicReviewEvidence(reviewIds: number[]): Promise<EvidenceRecord[]> {
  if (!reviewIds || reviewIds.length === 0) return [];

  const sql = `
    SELECT 
      r.review_id,
      r.user_id,
      u.username,
      u.display_name,
      r.movie_id,
      m.title AS movie_title,
      r.rating::float AS rating,
      COALESCE(r.review_text, '') AS review_text,
      r.has_spoilers,
      r.created_at::text AS created_at
    FROM reviews r
    JOIN users u ON r.user_id = u.user_id
    JOIN movies m ON r.movie_id = m.movie_id
    WHERE r.review_id = ANY($1::int[])
    ORDER BY r.created_at DESC;
  `;

  const res = await query<any>(sql, [reviewIds]);
  return res.rows.map((row) => {
    // Truncate snippet safely
    const cleanText = row.has_spoilers ? '' : row.review_text.trim();
    const snippet = cleanText.length > 300 ? cleanText.slice(0, 300) + '…' : cleanText;
    return {
      id: `R-${row.review_id.toString().padStart(4, '0')}`,
      sourceType: 'review',
      targetId: row.review_id,
      title: `${row.movie_title} (${row.rating}/10)`,
      author: row.display_name || row.username,
      rating: Number(row.rating),
      snippet: row.has_spoilers ? '[Spoiler withheld from AI investigation]' : snippet,
      isSpoiler: Boolean(row.has_spoilers),
      metadata: {
        movieId: row.movie_id,
        userId: row.user_id,
        username: row.username,
        fullText: cleanText,
      },
    };
  });
}

/**
 * 5. Retrieve verified movie metadata
 */
export async function getMovieContext(movieIds: number[]): Promise<any[]> {
  if (!movieIds || movieIds.length === 0) return [];

  const sql = `
    SELECT 
      m.movie_id,
      m.title,
      COALESCE(m.director, 'Unknown') AS director,
      TO_CHAR(m.release_date, 'YYYY-MM-DD') AS release_date,
      COALESCE(m.avg_rating, 0)::float AS avg_rating,
      COALESCE(m.review_count, 0)::int AS review_count,
      COALESCE(m.runtime, 120) AS runtime,
      COALESCE(m.poster_url, '') AS poster_url,
      COALESCE(m.backdrop_url, '') AS backdrop_url,
      COALESCE(m.overview, '') AS synopsis,
      COALESCE(array_agg(g.name) FILTER (WHERE g.name IS NOT NULL), '{}') AS genres
    FROM movies m
    LEFT JOIN movie_genres mg ON m.movie_id = mg.movie_id
    LEFT JOIN genres g ON mg.genre_id = g.genre_id
    WHERE m.movie_id = ANY($1::int[])
    GROUP BY m.movie_id;
  `;

  const res = await query<any>(sql, [movieIds]);
  return res.rows;
}

/**
 * 6. Build double feature challenge candidates
 * Recommends 2 high-quality films not yet reviewed or watchlisted by the user
 */
export async function buildChallengeCandidates(
  userId: number,
  focusMovieIds: number[]
): Promise<any[]> {
  const sql = `
    WITH candidate_movies AS (
      SELECT 
        m.movie_id,
        m.title,
        m.director,
        TO_CHAR(m.release_date, 'YYYY-MM-DD') AS release_date,
        m.avg_rating::float AS avg_rating,
        m.review_count::int AS review_count,
        m.runtime,
        m.poster_url,
        m.backdrop_url,
        COALESCE(m.overview, '') AS synopsis,
        COALESCE(array_agg(g.name) FILTER (WHERE g.name IS NOT NULL), '{}') AS genres
      FROM movies m
      LEFT JOIN movie_genres mg ON m.movie_id = mg.movie_id
      LEFT JOIN genres g ON mg.genre_id = g.genre_id
      WHERE m.movie_id NOT IN (
        SELECT movie_id FROM reviews WHERE user_id = $1
        UNION
        SELECT wi.movie_id FROM watchlist_items wi 
        JOIN watchlists w ON wi.watchlist_id = w.watchlist_id WHERE w.user_id = $1
      )
      AND m.movie_id != ALL($2::int[])
      GROUP BY m.movie_id
    )
    SELECT * FROM candidate_movies
    WHERE avg_rating >= 8.5
    ORDER BY avg_rating DESC, review_count DESC
    LIMIT 2;
  `;

  const res = await query<any>(sql, [userId, focusMovieIds]);
  return res.rows;
}
