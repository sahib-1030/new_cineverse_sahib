import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Get Tables with Columns & Types
    const tablesSql = `
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `;
    const tablesRes = await query(tablesSql);

    // Group columns by table
    const tablesMap: Record<string, any[]> = {};
    for (const row of tablesRes.rows) {
      if (!tablesMap[row.table_name]) {
        tablesMap[row.table_name] = [];
      }
      tablesMap[row.table_name].push({
        column: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        default: row.column_default,
      });
    }

    // 2. Get Table Row Counts
    const rowCounts: Record<string, number> = {};
    const tableNames = [
      'users', 'genres', 'movies', 'movie_genres', 'people', 
      'movie_cast', 'reviews', 'review_likes', 'watchlists', 
      'watchlist_items', 'follows', 'activity_logs', 'app_meta'
    ];

    for (const tbl of tableNames) {
      try {
        const countRes = await query(`SELECT COUNT(*)::INT as count FROM ${tbl};`);
        rowCounts[tbl] = countRes.rows[0]?.count || 0;
      } catch {
        rowCounts[tbl] = 0;
      }
    }

    // 3. Registered Triggers List
    const triggers = [
      {
        name: 'trg_update_movie_rating',
        table: 'reviews',
        events: 'INSERT / UPDATE / DELETE',
        purpose: 'Automatically recalculates movies.avg_rating and review_count in real time.',
        function: 'fn_trg_update_movie_rating_stats()'
      },
      {
        name: 'trg_log_review_activity',
        table: 'reviews',
        events: 'AFTER INSERT',
        purpose: 'Automatically records a social feed audit event in activity_logs.',
        function: 'fn_trg_log_review_activity()'
      },
      {
        name: 'trg_update_review_likes',
        table: 'review_likes',
        events: 'AFTER INSERT / DELETE',
        purpose: 'Syncs total like counters on reviews table.',
        function: 'fn_trg_update_review_likes()'
      },
      {
        name: 'trg_log_watchlist_add',
        table: 'watchlist_items',
        events: 'AFTER INSERT',
        purpose: 'Automatically records a social feed audit event when a film is bookmarked.',
        function: 'fn_trg_log_watchlist_activity()'
      }
    ];

    // 4. Stored Procedures & Functions
    const procedures = [
      {
        name: 'fn_recommend_movies(p_user_id, p_limit)',
        returnType: 'TABLE (movie_id, title, poster_url, avg_rating, reason)',
        purpose: 'Collaborative filtering discovery algorithm matching user genre affinity with high-rated films.'
      },
      {
        name: 'fn_get_user_analytics(p_user_id)',
        returnType: 'JSONB',
        purpose: 'Aggregates total watch time, average rating, rating distribution histogram (1-10), and top genres.'
      }
    ];

    // 5. Views
    const views = [
      {
        name: 'v_trending_movies',
        purpose: 'Ranks movies using a Bayesian weighted score formula.'
      },
      {
        name: 'v_user_leaderboard',
        purpose: 'Ranks community members using DENSE_RANK() window function.'
      },
      {
        name: 'v_genre_performance',
        purpose: 'Aggregates total movies, reviews, and average rating per genre.'
      },
      {
        name: 'v_recent_activity_feed',
        purpose: 'Unified relational view joining audit logs with users and movie titles.'
      }
    ];

    // Detect genuine database engine
    let engine = {
      type: 'postgres',
      label: 'POSTGRESQL 16 ENGINE',
      rawVersion: 'PostgreSQL 16',
    };
    try {
      const vRes = await query(`SELECT version();`);
      if (vRes.rows[0]?.version) {
        engine.rawVersion = vRes.rows[0].version;
        engine.label = 'POSTGRESQL 16 ENGINE';
      }
    } catch {}

    return NextResponse.json({
      engine,
      tables: tablesMap,
      rowCounts,
      triggers,
      procedures,
      views,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
