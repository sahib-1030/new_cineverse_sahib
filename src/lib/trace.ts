import { query, withTransaction } from '@/lib/db';

export interface TraceStep {
  step_id?: number;
  trace_id?: number;
  step_order: number;
  step_title: string;
  step_type: 'ROW_MUTATION' | 'TRIGGER' | 'AUDIT_LOG' | 'DOWNSTREAM_VIEW';
  target_object: string;
  operation: string;
  status: 'EXECUTED' | 'SKIPPED';
  description: string;
  sql_preview: string;
  before_state: any;
  after_state: any;
  created_at?: string;
}

export interface ActionTrace {
  trace_id: number;
  user_id: number;
  user_name?: string;
  action_type: string;
  target_type: string;
  target_id: number;
  movie_title?: string;
  movie_poster?: string;
  mutation_op: 'INSERT' | 'UPDATE';
  initial_score: number | null;
  final_score: number | null;
  created_at: string;
  metadata: any;
  steps: TraceStep[];
}

/**
 * Ensure CineTrace tables exist in the current database
 */
export async function ensureTraceTables(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS db_action_traces (
      trace_id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      action_type VARCHAR(50) NOT NULL,
      target_type VARCHAR(50) NOT NULL,
      target_id INT NOT NULL,
      mutation_op VARCHAR(20) NOT NULL,
      initial_score NUMERIC(3, 1),
      final_score NUMERIC(3, 1),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      metadata JSONB DEFAULT '{}'::jsonb
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS db_action_trace_steps (
      step_id SERIAL PRIMARY KEY,
      trace_id INT NOT NULL REFERENCES db_action_traces(trace_id) ON DELETE CASCADE,
      step_order INT NOT NULL,
      step_title VARCHAR(150) NOT NULL,
      step_type VARCHAR(50) NOT NULL,
      target_object VARCHAR(100) NOT NULL,
      operation VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      sql_preview TEXT,
      before_state JSONB,
      after_state JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * Captures real before/after states, executes the review mutation,
 * and records the genuine trigger/provenance lineage in PostgreSQL atomically.
 */
export async function captureReviewTrace(params: {
  userId: number;
  movieId: number;
  rating: number;
  reviewText: string;
  hasSpoilers: boolean;
}): Promise<{ review: any; trace: ActionTrace; updatedMovie: any }> {
  await ensureTraceTables();

  const { userId, movieId, rating, reviewText, hasSpoilers } = params;

  return await withTransaction(async (tx) => {
    // 1. Snapshot BEFORE state
    const prevReviewRes = await tx.query(
      `SELECT review_id, rating, review_text, has_spoilers, created_at, updated_at 
       FROM reviews 
       WHERE user_id = $1 AND movie_id = $2;`,
      [userId, movieId]
    );
    const existingReview = prevReviewRes.rows[0] || null;
    const isUpdate = Boolean(existingReview);

    const prevMovieRes = await tx.query(
      `SELECT movie_id, title, poster_url, avg_rating, review_count, director, release_date 
       FROM movies 
       WHERE movie_id = $1;`,
      [movieId]
    );
    const movieBefore = prevMovieRes.rows[0];

    const prevTrendingRes = await tx.query(
      `SELECT bayesian_score 
       FROM v_trending_movies 
       WHERE movie_id = $1;`,
      [movieId]
    );
    const prevBayesianScore = prevTrendingRes.rows[0]?.bayesian_score ?? null;

    // 2. Perform the authentic mutation
    const mutateSql = `
      INSERT INTO reviews (user_id, movie_id, rating, review_text, has_spoilers, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, movie_id)
      DO UPDATE SET
        rating = EXCLUDED.rating,
        review_text = EXCLUDED.review_text,
        has_spoilers = EXCLUDED.has_spoilers,
        updated_at = CURRENT_TIMESTAMP
      RETURNING review_id, user_id, movie_id, rating, review_text, has_spoilers, created_at, updated_at;
    `;
    const reviewMutationRes = await tx.query(mutateSql, [
      userId,
      movieId,
      rating,
      reviewText,
      hasSpoilers,
    ]);
    const reviewAfter = reviewMutationRes.rows[0];

    // 3. Snapshot AFTER state
    const afterMovieRes = await tx.query(
      `SELECT movie_id, title, poster_url, avg_rating, review_count, director, release_date 
       FROM movies 
       WHERE movie_id = $1;`,
      [movieId]
    );
    const movieAfter = afterMovieRes.rows[0];

    // Check activity logs (Trigger 2: trg_log_review_activity is AFTER INSERT only!)
    const activityLogRes = await tx.query(
      `SELECT log_id, activity_type, target_id, metadata, created_at 
       FROM activity_logs 
       WHERE user_id = $1 AND target_id = $2 AND activity_type = 'NEW_REVIEW'
       ORDER BY created_at DESC 
       LIMIT 1;`,
      [userId, movieId]
    );
    const latestActivityLog = activityLogRes.rows[0] || null;

    // Check new Bayesian score from dependent view v_trending_movies
    const afterTrendingRes = await tx.query(
      `SELECT bayesian_score 
       FROM v_trending_movies 
       WHERE movie_id = $1;`,
      [movieId]
    );
    const afterBayesianScore = afterTrendingRes.rows[0]?.bayesian_score ?? null;

    // 4. Record Trace Parent Row
    const traceInsertSql = `
      INSERT INTO db_action_traces (
        user_id, action_type, target_type, target_id, mutation_op, 
        initial_score, final_score, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const traceRes = await tx.query(traceInsertSql, [
      userId,
      'REVIEW_MUTATION',
      'movie',
      movieId,
      isUpdate ? 'UPDATE' : 'INSERT',
      movieBefore?.avg_rating ?? null,
      movieAfter?.avg_rating ?? null,
      JSON.stringify({
        movie_title: movieAfter?.title || movieBefore?.title,
        movie_poster: movieAfter?.poster_url || movieBefore?.poster_url,
        prev_review_id: existingReview?.review_id || null,
        new_review_id: reviewAfter?.review_id,
        rating_given: rating,
      }),
    ]);

    const traceRecord = traceRes.rows[0];
    const traceId = traceRecord.trace_id;

    // 5. Construct 4 Truthful Lineage Steps
    const steps: TraceStep[] = [
      {
        step_order: 1,
        step_title: isUpdate ? 'Review row updated' : 'Review row written',
        step_type: 'ROW_MUTATION',
        target_object: 'reviews',
        operation: isUpdate ? 'UPDATE' : 'INSERT',
        status: 'EXECUTED',
        description: isUpdate
          ? `Updated existing review for movie #${movieId} with score ${rating}/10 and revised notes.`
          : `Inserted new review for movie #${movieId} with score ${rating}/10 into relational storage.`,
        sql_preview: `INSERT INTO reviews (user_id, movie_id, rating, review_text) VALUES (${userId}, ${movieId}, ${rating}, '${reviewText.slice(0, 30)}...') ON CONFLICT (user_id, movie_id) DO UPDATE...`,
        before_state: existingReview,
        after_state: reviewAfter,
      },
      {
        step_order: 2,
        step_title: 'Movie statistics recalculated',
        step_type: 'TRIGGER',
        target_object: 'trg_update_movie_rating',
        operation: 'EXECUTE',
        status: 'EXECUTED',
        description: `PostgreSQL trigger fn_trg_update_movie_rating_stats() recalculated average rating (${movieBefore?.avg_rating ?? '0.0'} → ${movieAfter?.avg_rating}) and review count (${movieBefore?.review_count ?? 0} → ${movieAfter?.review_count}).`,
        sql_preview: `UPDATE movies SET avg_rating = ${movieAfter?.avg_rating}, review_count = ${movieAfter?.review_count} WHERE movie_id = ${movieId};`,
        before_state: {
          avg_rating: movieBefore?.avg_rating,
          review_count: movieBefore?.review_count,
        },
        after_state: {
          avg_rating: movieAfter?.avg_rating,
          review_count: movieAfter?.review_count,
        },
      },
      {
        step_order: 3,
        step_title: isUpdate ? 'Activity log skipped on update' : 'Activity logged in audit trail',
        step_type: 'AUDIT_LOG',
        target_object: 'trg_log_review_activity',
        operation: isUpdate ? 'TRIGGER_CONDITION_CHECK' : 'INSERT',
        status: isUpdate ? 'SKIPPED' : 'EXECUTED',
        description: isUpdate
          ? 'The activity log trigger fn_trg_log_review_activity is registered as AFTER INSERT on reviews. An UPDATE operation does not fire an insertion trigger, preventing duplicate feed clutter.'
          : `Audit event NEW_REVIEW added to activity_logs table for downstream social consumption.`,
        sql_preview: isUpdate
          ? `-- trg_log_review_activity: TG_OP = 'UPDATE' (trigger declared AFTER INSERT only; event skipped)`
          : `INSERT INTO activity_logs (user_id, activity_type, target_id, metadata) VALUES (${userId}, 'NEW_REVIEW', ${movieId}, jsonb_build_object(...));`,
        before_state: isUpdate ? { note: 'Existing activity entry preserved' } : null,
        after_state: isUpdate ? null : latestActivityLog,
      },
      {
        step_order: 4,
        step_title: 'Downstream ranking recalculated',
        step_type: 'DOWNSTREAM_VIEW',
        target_object: 'v_trending_movies',
        operation: 'QUERY',
        status: 'EXECUTED',
        description: `View v_trending_movies computes Bayesian weighted score (prior threshold = 3.0, global mean rating). Film score moved from ${prevBayesianScore ?? 'N/A'} to ${afterBayesianScore ?? 'N/A'}.`,
        sql_preview: `SELECT bayesian_score FROM v_trending_movies WHERE movie_id = ${movieId};`,
        before_state: { bayesian_score: prevBayesianScore },
        after_state: { bayesian_score: afterBayesianScore },
      },
    ];

    // Insert steps into database
    for (const step of steps) {
      await tx.query(
        `INSERT INTO db_action_trace_steps (
          trace_id, step_order, step_title, step_type, target_object, 
          operation, status, description, sql_preview, before_state, after_state
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
        [
          traceId,
          step.step_order,
          step.step_title,
          step.step_type,
          step.target_object,
          step.operation,
          step.status,
          step.description,
          step.sql_preview,
          JSON.stringify(step.before_state),
          JSON.stringify(step.after_state),
        ]
      );
    }

    const completeTrace: ActionTrace = {
      ...traceRecord,
      movie_title: movieAfter?.title || movieBefore?.title,
      movie_poster: movieAfter?.poster_url || movieBefore?.poster_url,
      steps,
    };

    return {
      review: reviewAfter,
      updatedMovie: movieAfter,
      trace: completeTrace,
    };
  });
}

/**
 * Retrieve a specific trace by ID with full step lineage
 */
export async function getTraceById(traceId: number): Promise<ActionTrace | null> {
  await ensureTraceTables();

  const traceRes = await query(
    `SELECT t.*, u.username, u.display_name, m.title AS movie_title, m.poster_url AS movie_poster
     FROM db_action_traces t
     JOIN users u ON t.user_id = u.user_id
     LEFT JOIN movies m ON t.target_id = m.movie_id
     WHERE t.trace_id = $1;`,
    [traceId]
  );

  if (traceRes.rows.length === 0) return null;
  const trace = traceRes.rows[0];

  const stepsRes = await query(
    `SELECT * FROM db_action_trace_steps 
     WHERE trace_id = $1 
     ORDER BY step_order ASC;`,
    [traceId]
  );

  return {
    ...trace,
    user_name: trace.display_name || trace.username,
    steps: stepsRes.rows,
  };
}

/**
 * Retrieve the latest action trace recorded in the system
 */
export async function getLatestTrace(movieId?: number): Promise<ActionTrace | null> {
  await ensureTraceTables();

  let sql = `
    SELECT t.*, u.username, u.display_name, m.title AS movie_title, m.poster_url AS movie_poster
    FROM db_action_traces t
    JOIN users u ON t.user_id = u.user_id
    LEFT JOIN movies m ON t.target_id = m.movie_id
  `;
  const params: any[] = [];

  if (movieId) {
    sql += ` WHERE t.target_id = $1 AND t.target_type = 'movie'`;
    params.push(movieId);
  }

  sql += ` ORDER BY t.created_at DESC LIMIT 1;`;

  const traceRes = await query(sql, params);
  if (traceRes.rows.length === 0) return null;

  const trace = traceRes.rows[0];
  const stepsRes = await query(
    `SELECT * FROM db_action_trace_steps 
     WHERE trace_id = $1 
     ORDER BY step_order ASC;`,
    [trace.trace_id]
  );

  return {
    ...trace,
    user_name: trace.display_name || trace.username,
    steps: stepsRes.rows,
  };
}
