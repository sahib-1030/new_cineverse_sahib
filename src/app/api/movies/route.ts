export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const genreSlug = searchParams.get('genre');
  const minRating = parseFloat(searchParams.get('minRating') || '0');
  const year = searchParams.get('year');
  const search = searchParams.get('search');
  const sortBy = searchParams.get('sortBy') || 'trending'; // 'trending', 'rating', 'reviews', 'year'
  const limit = parseInt(searchParams.get('limit') || '30', 10);

  const conditions: string[] = ['1=1'];
  const params: any[] = [];
  let paramIdx = 1;

  if (minRating > 0) {
    conditions.push(`m.avg_rating >= $${paramIdx++}`);
    params.push(minRating);
  }

  if (year) {
    conditions.push(`EXTRACT(YEAR FROM m.release_date) = $${paramIdx++}`);
    params.push(parseInt(year, 10));
  }

  if (search) {
    conditions.push(`(m.title ILIKE $${paramIdx} OR m.overview ILIKE $${paramIdx} OR m.director ILIKE $${paramIdx})`);
    params.push(`%${search}%`);
    paramIdx++;
  }

  if (genreSlug && genreSlug !== 'all') {
    conditions.push(`EXISTS (
      SELECT 1 FROM movie_genres mg 
      JOIN genres g ON mg.genre_id = g.genre_id 
      WHERE mg.movie_id = m.movie_id AND g.slug = $${paramIdx++}
    )`);
    params.push(genreSlug);
  }

  let orderBy = 'vtm.bayesian_score DESC NULLS LAST, m.review_count DESC';
  if (sortBy === 'rating') {
    orderBy = 'm.avg_rating DESC, m.review_count DESC';
  } else if (sortBy === 'reviews') {
    orderBy = 'm.review_count DESC, m.avg_rating DESC';
  } else if (sortBy === 'year') {
    orderBy = 'm.release_date DESC';
  }

  const sql = `
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
      COALESCE(vtm.bayesian_score, m.avg_rating) as bayesian_score,
      COALESCE(
        json_agg(
          json_build_object('genre_id', g.genre_id, 'name', g.name, 'slug', g.slug)
        ) FILTER (WHERE g.genre_id IS NOT NULL), '[]'
      ) AS genres
    FROM movies m
    LEFT JOIN v_trending_movies vtm ON m.movie_id = vtm.movie_id
    LEFT JOIN movie_genres mg ON m.movie_id = mg.movie_id
    LEFT JOIN genres g ON mg.genre_id = g.genre_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY m.movie_id, vtm.bayesian_score
    ORDER BY ${orderBy}
    LIMIT ${limit};
  `;

  try {
    const result = await query(sql, params);
    return NextResponse.json({
      movies: result.rows,
      meta: {
        sql: result.sql,
        params: result.params,
        durationMs: result.durationMs,
        count: result.rowCount,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
