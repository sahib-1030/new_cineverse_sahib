/**
 * CineVerse Data Dictionary Generator
 * Reads information_schema and database catalog constraints to generate docs/DATA_DICTIONARY.md
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { PGlite } = require('@electric-sql/pglite');

const TABLE_DESCRIPTIONS = {
  app_meta: 'System configuration, schema migration state, and DBMS operational metadata.',
  users: 'Registered cinephile accounts, credentials, profile bio, avatar, and banner media.',
  genres: 'Film categorization taxonomy (Action, Sci-Fi, Drama, etc.) with UI iconography.',
  movies: 'Film catalog containing TMDb identifiers, runtime, release date, director, and aggregate ratings.',
  movie_genres: 'Many-to-many junction bridge mapping movies to their respective genre classifications.',
  people: 'Cinema industry personnel including directors, actors, cinematographers, and crew members.',
  movie_cast: 'Junction table establishing actor and crew film credits with character names and cast billing order.',
  reviews: 'User ratings (1.0 - 10.0 scale) and textual critiques with spoiler tags and like counts.',
  review_likes: 'Social appreciation votes cast by users on film critiques.',
  watchlists: 'User-curated film collections and custom watchlists with public/private visibility.',
  watchlist_items: 'Junction table mapping individual catalog movies to specific user watchlists.',
  follows: 'Social graph directional relationships between platform cinephiles.',
  activity_logs: 'Immutable audit trail capturing user actions (reviews, list creations, follows).',
  db_action_traces: 'CineTrace provenance log header capturing state mutations and Bayesian score drift.',
  db_action_trace_steps: 'Fine-grained execution trace of trigger evaluations, audit logs, and downstream view dependencies.',
  agent_cases: 'Countercut AI detective case records, claims, debate metrics, and challenge watchlists.',
  agent_case_evidence: 'Auditable evidentiary excerpts linked to agent investigation case findings.',
};

const COLUMN_DESCRIPTIONS = {
  // app_meta
  'app_meta.key': 'Unique configuration identifier key',
  'app_meta.value': 'Serialized configuration string or schema version',
  'app_meta.updated_at': 'Timestamp of last configuration update',

  // users
  'users.user_id': 'Auto-incrementing surrogate primary key',
  'users.username': 'Unique alphanumeric handle for authentication and profile URL',
  'users.email': 'Unique contact email address for account authentication',
  'users.password_hash': 'Cryptographic scrypt password hash with unique per-user salt',
  'users.display_name': 'Human-readable full name displayed in community feeds and reviews',
  'users.bio': 'Short biographical summary describing user cinema tastes',
  'users.avatar_url': 'URL pointing to user profile avatar portrait image',
  'users.banner_url': 'URL pointing to user profile background header banner',
  'users.created_at': 'Timestamp of account registration in PostgreSQL',

  // genres
  'genres.genre_id': 'Auto-incrementing surrogate primary key',
  'genres.name': 'Canonical display name of genre (e.g. Science Fiction, Drama)',
  'genres.slug': 'URL-friendly lowercase slug identifier for routing',
  'genres.icon_name': 'Lucide UI icon identifier representing genre graphically',

  // movies
  'movies.movie_id': 'Auto-incrementing surrogate primary key',
  'movies.tmdb_id': 'The Movie Database (TMDb) external catalog identifier',
  'movies.title': 'Canonical title of the film',
  'movies.tagline': 'Short marketing tagline or cinematic promotional hook',
  'movies.overview': 'Full narrative synopsis and plot summary',
  'movies.release_date': 'Official theatrical premiere or release date',
  'movies.runtime': 'Total duration of the feature film in minutes',
  'movies.poster_url': 'High-resolution vertical portrait poster image URL',
  'movies.backdrop_url': 'High-resolution wide horizontal backdrop banner image URL',
  'movies.trailer_url': 'External video link to trailer (YouTube / Vimeo)',
  'movies.director': 'Primary director or filmmaker responsible for the work',
  'movies.avg_rating': 'Denormalized arithmetic mean rating maintained by trigger trg_update_movie_rating',
  'movies.review_count': 'Denormalized total review count maintained by trigger trg_update_movie_rating',
  'movies.created_at': 'Timestamp when movie record was inserted into database',

  // movie_genres
  'movie_genres.movie_id': 'Foreign key referencing target movies(movie_id)',
  'movie_genres.genre_id': 'Foreign key referencing target genres(genre_id)',

  // people
  'people.person_id': 'Auto-incrementing surrogate primary key',
  'people.tmdb_id': 'External TMDb person identifier for cross-referencing',
  'people.name': 'Full canonical name of actor, director, or crew member',
  'people.profile_url': 'Portrait photograph URL of the film personality',
  'people.biography': 'Biographical narrative of person industry career',

  // movie_cast
  'movie_cast.movie_id': 'Foreign key referencing movies(movie_id)',
  'movie_cast.person_id': 'Foreign key referencing people(person_id)',
  'movie_cast.character_name': 'Character played by actor or technical crew role performed',
  'movie_cast.cast_order': 'Billing order in credits sequence (0 = top-billed lead)',

  // reviews
  'reviews.review_id': 'Auto-incrementing surrogate primary key',
  'reviews.user_id': 'Foreign key referencing reviewing author users(user_id)',
  'reviews.movie_id': 'Foreign key referencing evaluated film movies(movie_id)',
  'reviews.rating': 'Numerical evaluation score on a 1.0 to 10.0 scale',
  'reviews.review_text': 'Textual critique or commentary (optional)',
  'reviews.has_spoilers': 'Flag indicating if review discloses major plot twists',
  'reviews.likes_count': 'Denormalized count of helpful votes maintained by trigger',
  'reviews.created_at': 'Timestamp of original critique submission',
  'reviews.updated_at': 'Timestamp of most recent review edit or rating adjustment',

  // review_likes
  'review_likes.like_id': 'Auto-incrementing surrogate primary key',
  'review_likes.review_id': 'Foreign key referencing target reviews(review_id)',
  'review_likes.user_id': 'Foreign key referencing liking users(user_id)',
  'review_likes.created_at': 'Timestamp when like appreciation was registered',

  // watchlists
  'watchlists.watchlist_id': 'Auto-incrementing surrogate primary key',
  'watchlists.user_id': 'Foreign key referencing list owner users(user_id)',
  'watchlists.name': 'Curated title of the watchlist collection',
  'watchlists.description': 'Curatorial explanation or thematic description',
  'watchlists.is_public': 'Visibility toggle (TRUE = public community, FALSE = private)',
  'watchlists.created_at': 'Timestamp when collection was created',

  // watchlist_items
  'watchlist_items.watchlist_id': 'Foreign key referencing parent watchlists(watchlist_id)',
  'watchlist_items.movie_id': 'Foreign key referencing cataloged movies(movie_id)',
  'watchlist_items.added_at': 'Timestamp when movie was added to the list',

  // follows
  'follows.follow_id': 'Auto-incrementing surrogate primary key',
  'follows.follower_id': 'Foreign key referencing subscribing user users(user_id)',
  'follows.following_id': 'Foreign key referencing followed target user users(user_id)',
  'follows.created_at': 'Timestamp when social follow relationship began',

  // activity_logs
  'activity_logs.log_id': 'Auto-incrementing surrogate primary key',
  'activity_logs.user_id': 'Foreign key referencing actor users(user_id)',
  'activity_logs.activity_type': 'Action category (NEW_REVIEW, CREATE_LIST, WATCHLIST_ADD, FOLLOW)',
  'activity_logs.target_id': 'Polymorphic target entity ID (movie_id, watchlist_id, or user_id)',
  'activity_logs.metadata': 'Structured JSONB contextual payload with denormalized titles and posters',
  'activity_logs.created_at': 'Timestamp when action occurred',

  // db_action_traces
  'db_action_traces.trace_id': 'Auto-incrementing surrogate primary key',
  'db_action_traces.user_id': 'Foreign key referencing acting users(user_id)',
  'db_action_traces.action_type': 'Mutation type indicator (e.g. REVIEW_MUTATION)',
  'db_action_traces.target_type': 'Target domain entity classification (e.g. movie)',
  'db_action_traces.target_id': 'Target entity identifier',
  'db_action_traces.mutation_op': 'SQL mutation operation (INSERT or UPDATE)',
  'db_action_traces.initial_score': 'Downstream Bayesian score prior to mutation',
  'db_action_traces.final_score': 'Downstream Bayesian score after trigger recalculation',
  'db_action_traces.created_at': 'Timestamp when CineTrace provenance record was captured',
  'db_action_traces.metadata': 'JSONB audit metadata with snapshot diff details',

  // db_action_trace_steps
  'db_action_trace_steps.step_id': 'Auto-incrementing surrogate primary key',
  'db_action_trace_steps.trace_id': 'Foreign key referencing parent db_action_traces(trace_id)',
  'db_action_trace_steps.step_order': 'Sequence index of execution in transaction (1, 2, 3, 4)',
  'db_action_trace_steps.step_title': 'Human-readable description of trace step',
  'db_action_trace_steps.step_type': 'Execution category (ROW_MUTATION, TRIGGER, AUDIT_LOG, DOWNSTREAM_VIEW)',
  'db_action_trace_steps.target_object': 'Database table or routine targeted (reviews, movies, etc.)',
  'db_action_trace_steps.operation': 'Action verb (INSERT, UPDATE, EXECUTE, EVALUATE, SELECT)',
  'db_action_trace_steps.status': 'Execution status (EXECUTED or SKIPPED)',
  'db_action_trace_steps.description': 'Technical justification of execution outcome',
  'db_action_trace_steps.sql_preview': 'Raw SQL statement or routine invoked',
  'db_action_trace_steps.before_state': 'JSONB snapshot of state before step execution',
  'db_action_trace_steps.after_state': 'JSONB snapshot of state after step execution',
  'db_action_trace_steps.created_at': 'Timestamp when step was recorded',

  // agent_cases
  'agent_cases.case_id': 'Unique cryptographic case UUID identifier',
  'agent_cases.user_id': 'Foreign key referencing client users(user_id)',
  'agent_cases.primary_movie_id': 'Foreign key referencing primary analyzed film movies(movie_id)',
  'agent_cases.secondary_movie_id': 'Optional foreign key referencing contrast film movies(movie_id)',
  'agent_cases.opposite_critic_id': 'Optional foreign key referencing dialectical opposing critic users(user_id)',
  'agent_cases.investigation_type': 'Analysis category (contrast_pair, opposing_critic, hot_take, taste_drift)',
  'agent_cases.status': 'Case lifecycle state (open, verified, archived)',
  'agent_cases.connector_label': 'Thematic synthesis title explaining taste divergence',
  'agent_cases.case_notes': 'Detailed investigative narrative and analytical synthesis',
  'agent_cases.factual_metrics': 'Structured JSONB array of verified database metrics',
  'agent_cases.claims': 'Structured JSONB array of empirical debate claims',
  'agent_cases.alternative_explanations': 'Structured JSONB array of counter-theses',
  'agent_cases.limitations': 'Structured JSONB array of sample size and methodology limits',
  'agent_cases.tool_receipts': 'Structured JSONB audit receipts of agent tool executions',
  'agent_cases.proposed_challenge': 'Structured JSONB challenge watchlist configuration',
  'agent_cases.created_at': 'Timestamp of investigation completion',

  // agent_case_evidence
  'agent_case_evidence.evidence_id': 'Unique evidence identifier key',
  'agent_case_evidence.case_id': 'Foreign key referencing parent agent_cases(case_id)',
  'agent_case_evidence.source_type': 'Origin entity type (review, watchlist, rating)',
  'agent_case_evidence.target_id': 'ID of referenced entity',
  'agent_case_evidence.title': 'Descriptive evidence title for presentation',
  'agent_case_evidence.snippet': 'Exact quote or metric value retrieved from database',
  'agent_case_evidence.created_at': 'Timestamp when evidence was linked',
};

async function main() {
  console.log('📖 Generating CineVerse Data Dictionary from PostgreSQL Schema...');

  let client;
  let pool;
  let usePool = false;

  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    try {
      pool = new Pool({ connectionString, connectionTimeoutMillis: 2000 });
      await pool.query('SELECT 1;');
      client = pool;
      usePool = true;
      console.log('🔌 Connected to PostgreSQL via DATABASE_URL');
    } catch {
      usePool = false;
    }
  }

  if (!usePool) {
    const dbPath = path.join(__dirname, '..', '.pglite_db');
    client = new PGlite(dbPath);
    console.log('⚡ Connected to local PGlite database (.pglite_db)');
  }

  // 1. Get all tables in public schema
  const tablesQuery = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  const tablesRes = await client.query(tablesQuery);
  const tables = tablesRes.rows.map(r => r.table_name);

  // Desired ordering matching logical schema progression
  const preferredOrder = [
    'app_meta',
    'users',
    'genres',
    'movies',
    'movie_genres',
    'people',
    'movie_cast',
    'reviews',
    'review_likes',
    'watchlists',
    'watchlist_items',
    'follows',
    'activity_logs',
    'db_action_traces',
    'db_action_trace_steps',
    'agent_cases',
    'agent_case_evidence'
  ];

  // Sort by preferred order
  tables.sort((a, b) => {
    const idxA = preferredOrder.indexOf(a);
    const idxB = preferredOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  console.log(`Found ${tables.length} tables in schema.`);

  let md = '';
  md += `# CineVerse Database Data Dictionary\n\n`;
  md += `**Candidate / Identifier:** Sahib Singh (\`24BCI0292\`, \`SAHIB_24BCI0292\`)  \n`;
  md += `**Repository:** \`new_cineverse_sahib\`  \n`;
  md += `**Database Engine:** PostgreSQL 16+ / Embedded PostgreSQL (PGlite)  \n`;
  md += `**Total Tables:** ${tables.length}  \n`;
  md += `**Generated At:** ${new Date().toISOString()}  \n\n`;
  md += `This comprehensive data dictionary catalogues all **${tables.length} tables**, column specifications, nullability, relational constraints (Primary Keys, Foreign Keys, Unique, and Check Constraints), defaults, and semantic definitions inspected directly from PostgreSQL \`information_schema\` and database catalog metadata.\n\n`;

  md += `## Table Summary Index\n\n`;
  md += `| # | Table Name | Purpose / Domain | Columns |\n`;
  md += `|---|---|---|---|\n`;

  // Fetch column counts per table
  const colCountMap = {};
  for (const t of tables) {
    const cRes = await client.query(`SELECT COUNT(*)::int as c FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1;`, [t]);
    colCountMap[t] = cRes.rows[0].c;
    const desc = TABLE_DESCRIPTIONS[t] || 'Domain entity table.';
    md += `| **${tables.indexOf(t) + 1}** | [\`${t}\`](#${tables.indexOf(t) + 1}-${t}) | ${desc} | ${colCountMap[t]} |\n`;
  }
  md += `\n---\n\n`;

  // 2. Iterate each table and build detailed column catalog
  for (let tIdx = 0; tIdx < tables.length; tIdx++) {
    const tableName = tables[tIdx];
    const tableDesc = TABLE_DESCRIPTIONS[tableName] || 'Core entity table in CineVerse relational schema.';

    console.log(`Analyzing table [${tIdx + 1}/${tables.length}]: ${tableName}...`);

    md += `### ${tIdx + 1}. \`${tableName}\`\n\n`;
    md += `**Description:** ${tableDesc}\n\n`;

    // Fetch column details
    const colsRes = await client.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [tableName]);

    // Fetch constraints for this table
    const constraintsRes = await client.query(`
      SELECT
        kcu.column_name,
        tc.constraint_type,
        tc.constraint_name,
        ccu.table_name AS foreign_table,
        ccu.column_name AS foreign_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_schema = 'public' AND tc.table_name = $1;
    `, [tableName]);

    const constraintsByCol = {};
    for (const c of constraintsRes.rows) {
      if (!constraintsByCol[c.column_name]) {
        constraintsByCol[c.column_name] = [];
      }
      if (c.constraint_type === 'PRIMARY KEY') {
        constraintsByCol[c.column_name].push('`PRIMARY KEY`');
      } else if (c.constraint_type === 'FOREIGN KEY' && c.foreign_table) {
        constraintsByCol[c.column_name].push(`\`FK -> ${c.foreign_table}(${c.foreign_column})\``);
      } else if (c.constraint_type === 'UNIQUE') {
        constraintsByCol[c.column_name].push('`UNIQUE`');
      }
    }

    md += `| Column Name | Data Type | Nullable | Key / Constraint | Default Value | Description |\n`;
    md += `|---|---|---|---|---|---|\n`;

    for (const col of colsRes.rows) {
      const colKey = `${tableName}.${col.column_name}`;
      let formattedType = col.data_type.toUpperCase();
      if (col.character_maximum_length) {
        formattedType += `(${col.character_maximum_length})`;
      } else if (col.numeric_precision && col.numeric_scale) {
        formattedType += `(${col.numeric_precision}, ${col.numeric_scale})`;
      }

      const isNullable = col.is_nullable === 'YES' ? 'NULL' : '**NOT NULL**';
      const keyConstraint = (constraintsByCol[col.column_name] || []).join('<br>') || '-';
      let defVal = col.column_default || '-';
      if (defVal.length > 35) {
        defVal = defVal.substring(0, 32) + '...';
      }
      if (defVal !== '-') {
        defVal = `\`${defVal}\``;
      }

      const colDesc = COLUMN_DESCRIPTIONS[colKey] || 'Field storing attributes for ' + tableName;

      md += `| \`${col.column_name}\` | \`${formattedType}\` | ${isNullable} | ${keyConstraint} | ${defVal} | ${colDesc} |\n`;
    }

    md += `\n`;
  }

  // Add notes on triggers and procedures
  md += `\n---\n\n`;
  md += `## Stored Procedures & Analytical Routines Catalog\n\n`;
  md += `| Routine Name | Type | Owner | Parameters | Description |\n`;
  md += `|---|---|---|---|---|\n`;
  md += `| \`sp_sahib_24bci0292_add_review\` | **PROCEDURE** | \`SAHIB_24BCI0292\` | \`p_user_id INT, p_movie_id INT, p_rating NUMERIC, p_text TEXT\` | Validates input, upserts review atomically, relies on \`trg_update_movie_rating\` |\n`;
  md += `| \`fn_sahib_24bci0292_user_summary\` | **FUNCTION** | \`SAHIB_24BCI0292\` | \`p_user_id INT\` | Returns table of user activity metrics with candidate owner tag |\n`;
  md += `| \`fn_recommend_movies\` | **FUNCTION** | System | \`p_user_id INT, p_limit INT DEFAULT 6\` | Analytical genre-affinity and platform popularity fallback recommendation engine |\n`;
  md += `| \`fn_get_user_analytics\` | **FUNCTION** | System | \`p_user_id INT\` | Computes aggregate rating distribution histogram and watchtime statistics in JSONB |\n`;
  md += `| \`fn_trg_update_movie_rating_stats\` | **TRIGGER FUNC** | System | None | Automatically recalculates \`movies.avg_rating\` and \`movies.review_count\` |\n`;
  md += `| \`fn_trg_log_review_activity\` | **TRIGGER FUNC** | System | None | Generates activity audit entry in \`activity_logs\` upon new review insertion |\n`;
  md += `| \`fn_trg_update_review_likes\` | **TRIGGER FUNC** | System | None | Maintains denormalized \`reviews.likes_count\` upon like additions/removals |\n`;
  md += `| \`fn_trg_log_watchlist_add\` | **TRIGGER FUNC** | System | None | Logs activity audit log event upon movie addition to watchlist |\n\n`;

  md += `## Views Catalog\n\n`;
  md += `| View Name | Owner | Base Tables | Description |\n`;
  md += `|---|---|---|---|\n`;
  md += `| \`v_trending_movies\` | System | \`movies\`, \`reviews\` | Computes Bayesian weighted mean score prior with dynamic review threshold |\n`;
  md += `| \`v_user_leaderboard\` | System | \`users\`, \`reviews\` | Ranks top community reviewers using \`DENSE_RANK()\` window function |\n`;
  md += `| \`v_genre_performance\` | System | \`genres\`, \`movie_genres\`, \`reviews\` | Aggregates volume and average satisfaction per film genre |\n`;
  md += `| \`v_recent_activity_feed\` | System | \`activity_logs\`, \`users\`, \`movies\`, \`watchlists\` | Polymorphic-safe unified community timeline |\n`;
  md += `| \`v_sahib_24bci0292_top_rated\` | \`SAHIB_24BCI0292\` | \`movies\` | Candidate-tagged top-rated films view with \`owner\` provenance column |\n`;
  md += `| \`v_sahib_24bci0292_trending\` | \`SAHIB_24BCI0292\` | \`v_trending_movies\` | Candidate-tagged wrapper view with \`owner\` provenance column |\n`;

  const outputPath = path.join(__dirname, '..', 'docs', 'DATA_DICTIONARY.md');
  fs.writeFileSync(outputPath, md, 'utf8');

  console.log(`✅ Data Dictionary successfully generated at: ${outputPath}`);
  console.log(`   Catalogued ${tables.length} tables.`);

  if (pool) {
    await pool.end().catch(() => {});
  }
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error generating data dictionary:', err);
  process.exit(1);
});
