export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const movieId = parseInt(params.id, 10);
  if (isNaN(movieId)) {
    return NextResponse.json({ error: 'Invalid movie ID' }, { status: 400 });
  }

  try {
    // 1. Fetch Movie details + Genres
    const movieSql = `
      SELECT 
        m.movie_id,
        m.tmdb_id,
        m.title,
        m.tagline,
        m.overview,
        m.release_date,
        m.runtime,
        m.poster_url,
        m.backdrop_url,
        m.trailer_url,
        m.director,
        m.avg_rating,
        m.review_count,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object('genre_id', g.genre_id, 'name', g.name, 'slug', g.slug)
          ) FILTER (WHERE g.genre_id IS NOT NULL), '[]'::json
        ) AS genres
      FROM movies m
      LEFT JOIN movie_genres mg ON m.movie_id = mg.movie_id
      LEFT JOIN genres g ON mg.genre_id = g.genre_id
      WHERE m.movie_id = $1
      GROUP BY m.movie_id;
    `;
    const movieRes = await query(movieSql, [movieId]);

    if (movieRes.rows.length === 0) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    // 2. Fetch Cast & Crew
    const castSql = `
      SELECT 
        p.person_id,
        p.name,
        p.profile_path,
        p.known_for_department,
        mc.character_name,
        mc.job_role,
        mc.cast_order
      FROM movie_cast mc
      JOIN people p ON mc.person_id = p.person_id
      WHERE mc.movie_id = $1
      ORDER BY mc.cast_order ASC, mc.job_role ASC;
    `;
    const castRes = await query(castSql, [movieId]);

    // 3. Fetch Reviews for this movie with User Details
    const reviewsSql = `
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
        u.avatar_url
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.movie_id = $1
      ORDER BY r.likes_count DESC, r.created_at DESC;
    `;
    const reviewsRes = await query(reviewsSql, [movieId]);

    // 4. Rating Distribution Histogram (1-10) using SQL aggregation
    const histogramSql = `
      SELECT 
        bucket.rating_val AS rating_star,
        COALESCE(COUNT(r.review_id), 0)::INT AS count
      FROM generate_series(1, 10) AS bucket(rating_val)
      LEFT JOIN reviews r ON FLOOR(r.rating) = bucket.rating_val AND r.movie_id = $1
      GROUP BY bucket.rating_val
      ORDER BY bucket.rating_val ASC;
    `;
    const histogramRes = await query(histogramSql, [movieId]);

    // 5. Related Movies (Same genres, high rating)
    const relatedSql = `
      SELECT DISTINCT 
        m.movie_id,
        m.title,
        m.poster_url,
        m.backdrop_url,
        m.release_date,
        m.avg_rating,
        m.review_count
      FROM movies m
      JOIN movie_genres mg ON m.movie_id = mg.movie_id
      WHERE mg.genre_id IN (
        SELECT genre_id FROM movie_genres WHERE movie_id = $1
      )
      AND m.movie_id != $1
      ORDER BY m.avg_rating DESC
      LIMIT 6;
    `;
    const relatedRes = await query(relatedSql, [movieId]);

    return NextResponse.json({
      movie: movieRes.rows[0],
      cast: castRes.rows,
      reviews: reviewsRes.rows,
      ratingHistogram: histogramRes.rows,
      relatedMovies: relatedRes.rows,
      meta: {
        sql: movieSql,
        durationMs: movieRes.durationMs + castRes.durationMs + reviewsRes.durationMs,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
