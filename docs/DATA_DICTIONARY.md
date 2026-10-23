# CineVerse Database Data Dictionary

**Candidate / Identifier:** Sahib Singh (`24BCI0292`, `SAHIB_24BCI0292`)  
**Repository:** `new_cineverse_sahib`  
**Database Engine:** PostgreSQL 16+ / Embedded PostgreSQL (PGlite)  
**Total Tables:** 17  
**Generated At:** 2026-10-23T12:42:02.037Z  

This comprehensive data dictionary catalogues all **17 tables**, column specifications, nullability, relational constraints (Primary Keys, Foreign Keys, Unique, and Check Constraints), defaults, and semantic definitions inspected directly from PostgreSQL `information_schema` and database catalog metadata.

## Table Summary Index

| # | Table Name | Purpose / Domain | Columns |
|---|---|---|---|
| **1** | [`app_meta`](#1-app_meta) | System configuration, schema migration state, and DBMS operational metadata. | 3 |
| **2** | [`users`](#2-users) | Registered cinephile accounts, credentials, profile bio, avatar, and banner media. | 9 |
| **3** | [`genres`](#3-genres) | Film categorization taxonomy (Action, Sci-Fi, Drama, etc.) with UI iconography. | 4 |
| **4** | [`movies`](#4-movies) | Film catalog containing TMDb identifiers, runtime, release date, director, and aggregate ratings. | 14 |
| **5** | [`movie_genres`](#5-movie_genres) | Many-to-many junction bridge mapping movies to their respective genre classifications. | 2 |
| **6** | [`people`](#6-people) | Cinema industry personnel including directors, actors, cinematographers, and crew members. | 5 |
| **7** | [`movie_cast`](#7-movie_cast) | Junction table establishing actor and crew film credits with character names and cast billing order. | 5 |
| **8** | [`reviews`](#8-reviews) | User ratings (1.0 - 10.0 scale) and textual critiques with spoiler tags and like counts. | 9 |
| **9** | [`review_likes`](#9-review_likes) | Social appreciation votes cast by users on film critiques. | 3 |
| **10** | [`watchlists`](#10-watchlists) | User-curated film collections and custom watchlists with public/private visibility. | 8 |
| **11** | [`watchlist_items`](#11-watchlist_items) | Junction table mapping individual catalog movies to specific user watchlists. | 4 |
| **12** | [`follows`](#12-follows) | Social graph directional relationships between platform cinephiles. | 3 |
| **13** | [`activity_logs`](#13-activity_logs) | Immutable audit trail capturing user actions (reviews, list creations, follows). | 6 |
| **14** | [`db_action_traces`](#14-db_action_traces) | CineTrace provenance log header capturing state mutations and Bayesian score drift. | 10 |
| **15** | [`db_action_trace_steps`](#15-db_action_trace_steps) | Fine-grained execution trace of trigger evaluations, audit logs, and downstream view dependencies. | 13 |
| **16** | [`agent_cases`](#16-agent_cases) | Countercut AI detective case records, claims, debate metrics, and challenge watchlists. | 21 |
| **17** | [`agent_case_evidence`](#17-agent_case_evidence) | Auditable evidentiary excerpts linked to agent investigation case findings. | 8 |

---

### 1. `app_meta`

**Description:** System configuration, schema migration state, and DBMS operational metadata.

| Column Name | Data Type | Nullable | Key / Constraint | Default Value | Description |
|---|---|---|---|---|---|
| `key` | `CHARACTER VARYING(50)` | **NOT NULL** | `PRIMARY KEY` | - | Unique configuration identifier key |
| `value` | `TEXT` | **NOT NULL** | - | - | Serialized configuration string or schema version |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | NULL | - | `CURRENT_TIMESTAMP` | Timestamp of last configuration update |

### 2. `users`

**Description:** Registered cinephile accounts, credentials, profile bio, avatar, and banner media.

| Column Name | Data Type | Nullable | Key / Constraint | Default Value | Description |
|---|---|---|---|---|---|
| `user_id` | `INTEGER` | **NOT NULL** | `PRIMARY KEY` | `nextval('users_user_id_seq'::reg...` | Auto-incrementing surrogate primary key |
| `username` | `CHARACTER VARYING(50)` | **NOT NULL** | `UNIQUE` | - | Unique alphanumeric handle for authentication and profile URL |
| `email` | `CHARACTER VARYING(100)` | **NOT NULL** | `UNIQUE` | - | Unique contact email address for account authentication |
| `password_hash` | `CHARACTER VARYING(255)` | **NOT NULL** | - | - | Cryptographic scrypt password hash with unique per-user salt |
| `display_name` | `CHARACTER VARYING(100)` | **NOT NULL** | - | - | Human-readable full name displayed in community feeds and reviews |
| `bio` | `TEXT` | NULL | - | - | Short biographical summary describing user cinema tastes |
| `avatar_url` | `CHARACTER VARYING(500)` | NULL | - | `'https://images.unsplash.com/pho...` | URL pointing to user profile avatar portrait image |
| `banner_url` | `CHARACTER VARYING(500)` | NULL | - | `'https://images.unsplash.com/pho...` | URL pointing to user profile background header banner |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | NULL | - | `CURRENT_TIMESTAMP` | Timestamp of account registration in PostgreSQL |

### 3. `genres`

**Description:** Film categorization taxonomy (Action, Sci-Fi, Drama, etc.) with UI iconography.

| Column Name | Data Type | Nullable | Key / Constraint | Default Value | Description |
|---|---|---|---|---|---|
| `genre_id` | `INTEGER` | **NOT NULL** | `PRIMARY KEY` | `nextval('genres_genre_id_seq'::r...` | Auto-incrementing surrogate primary key |
| `name` | `CHARACTER VARYING(50)` | **NOT NULL** | `UNIQUE` | - | Canonical display name of genre (e.g. Science Fiction, Drama) |
| `slug` | `CHARACTER VARYING(50)` | **NOT NULL** | `UNIQUE` | - | URL-friendly lowercase slug identifier for routing |
| `icon_name` | `CHARACTER VARYING(30)` | NULL | - | `'film'::character varying` | Lucide UI icon identifier representing genre graphically |

### 4. `movies`

**Description:** Film catalog containing TMDb identifiers, runtime, release date, director, and aggregate ratings.

| Column Name | Data Type | Nullable | Key / Constraint | Default Value | Description |
|---|---|---|---|---|---|
| `movie_id` | `INTEGER` | **NOT NULL** | `PRIMARY KEY` | `nextval('movies_movie_id_seq'::r...` | Auto-incrementing surrogate primary key |
| `tmdb_id` | `INTEGER` | NULL | `UNIQUE` | - | The Movie Database (TMDb) external catalog identifier |
| `title` | `CHARACTER VARYING(255)` | **NOT NULL** | - | - | Canonical title of the film |
| `tagline` | `TEXT` | NULL | - | - | Short marketing tagline or cinematic promotional hook |
| `overview` | `TEXT` | **NOT NULL** | - | - | Full narrative synopsis and plot summary |
| `release_date` | `DATE` | **NOT NULL** | - | - | Official theatrical premiere or release date |
| `runtime` | `INTEGER` | **NOT NULL** | - | - | Total duration of the feature film in minutes |
| `poster_url` | `CHARACTER VARYING(500)` | **NOT NULL** | - | - | High-resolution vertical portrait poster image URL |
| `backdrop_url` | `CHARACTER VARYING(500)` | **NOT NULL** | - | - | High-resolution wide horizontal backdrop banner image URL |
| `trailer_url` | `CHARACTER VARYING(500)` | NULL | - | - | External video link to trailer (YouTube / Vimeo) |
| `director` | `CHARACTER VARYING(150)` | NULL | - | - | Primary director or filmmaker responsible for the work |
| `avg_rating` | `NUMERIC(3, 1)` | NULL | - | `0.0` | Denormalized arithmetic mean rating maintained by trigger trg_update_movie_rating |
| `review_count` | `INTEGER` | NULL | - | `0` | Denormalized total review count maintained by trigger trg_update_movie_rating |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | NULL | - | `CURRENT_TIMESTAMP` | Timestamp when movie record was inserted into database |

### 5. `movie_genres`

**Description:** Many-to-many junction bridge mapping movies to their respective genre classifications.

| Column Name | Data Type | Nullable | Key / Constraint | Default Value | Description |
|---|---|---|---|---|---|
| `movie_id` | `INTEGER` | **NOT NULL** | `FK -> movies(movie_id)`<br>`PRIMARY KEY`<br>`PRIMARY KEY` | - | Foreign key referencing target movies(movie_id) |
| `genre_id` | `INTEGER` | **NOT NULL** | `FK -> genres(genre_id)`<br>`PRIMARY KEY`<br>`PRIMARY KEY` | - | Foreign key referencing target genres(genre_id) |

### 6. `people`

**Description:** Cinema industry personnel including directors, actors, cinematographers, and crew members.

| Column Name | Data Type | Nullable | Key / Constraint | Default Value | Description |
|---|---|---|---|---|---|
| `person_id` | `INTEGER` | **NOT NULL** | `PRIMARY KEY` | `nextval('people_person_id_seq'::...` | Auto-incrementing surrogate primary key |
| `name` | `CHARACTER VARYING(150)` | **NOT NULL** | - | - | Full canonical name of actor, director, or crew member |
| `profile_path` | `CHARACTER VARYING(500)` | NULL | - | - | Field storing attributes for people |
| `known_for_department` | `CHARACTER VARYING(50)` | NULL | - | `'Acting'::character varying` | Field storing attributes for people |
| `biography` | `TEXT` | NULL | - | - | Biographical narrative of person industry career |

### 7. `movie_cast`

**Description:** Junction table establishing actor and crew film credits with character names and cast billing order.

| Column Name | Data Type | Nullable | Key / Constraint | Default Value | Description |
|---|---|---|---|---|---|
| `movie_id` | `INTEGER` | **NOT NULL** | `FK -> movies(movie_id)`<br>`PRIMARY KEY`<br>`PRIMARY KEY`<br>`PRIMARY KEY` | - | Foreign key referencing movies(movie_id) |
| `person_id` | `INTEGER` | **NOT NULL** | `FK -> people(person_id)`<br>`PRIMARY KEY`<br>`PRIMARY KEY`<br>`PRIMARY KEY` | - | Foreign key referencing people(person_id) |
| `character_name` | `CHARACTER VARYING(150)` | NULL | - | - | Character played by actor or technical crew role performed |
| `job_role` | `CHARACTER VARYING(50)` | **NOT NULL** | `PRIMARY KEY`<br>`PRIMARY KEY`<br>`PRIMARY KEY` | `'Actor'::character varying` | Field storing attributes for movie_cast |
| `cast_order` | `INTEGER` | NULL | - | `0` | Billing order in credits sequence (0 = top-billed lead) |

### 8. `reviews`

**Description:** User ratings (1.0 - 10.0 scale) and textual critiques with spoiler tags and like counts.

| Column Name | Data Type | Nullable | Key / Constraint | Default Value | Description |
|---|---|---|---|---|---|
| `review_id` | `INTEGER` | **NOT NULL** | `PRIMARY KEY` | `nextval('reviews_review_id_seq':...` | Auto-incrementing surrogate primary key |
| `user_id` | `INTEGER` | **NOT NULL** | `FK -> users(user_id)`<br>`UNIQUE`<br>`UNIQUE` | - | Foreign key referencing reviewing author users(user_id) |
| `movie_id` | `INTEGER` | **NOT NULL** | `FK -> movies(movie_id)`<br>`UNIQUE`<br>`UNIQUE` | - | Foreign key referencing evaluated film movies(movie_id) |
| `rating` | `NUMERIC(3, 1)` | **NOT NULL** | - | - | Numerical evaluation score on a 1.0 to 10.0 scale |
| `review_text` | `TEXT` | NULL | - | `''::text` | Textual critique or commentary (optional) |
| `has_spoilers` | `BOOLEAN` | NULL | - | `false` | Flag indicating if review discloses major plot twists |
| `likes_count` | `INTEGER` | NULL | - | `0` | Denormalized count of helpful votes maintained by trigger |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | NULL | - | `CURRENT_TIMESTAMP` | Timestamp of original critique submission |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | NULL | - | `CURRENT_TIMESTAMP` | Timestamp of most recent review edit or rating adjustment |

### 9. `review_likes`

**Description:** Social appreciation votes cast by users on film critiques.

| Column Name | Data Type | Nullable | Key / Constraint | Default Value | Description |
|---|---|---|---|---|---|
| `user_id` | `INTEGER` | **NOT NULL** | `PRIMARY KEY`<br>`PRIMARY KEY`<br>`FK -> users(user_id)` | - | Foreign key referencing liking users(user_id) |
| `review_id` | `INTEGER` | **NOT NULL** | `PRIMARY KEY`<br>`PRIMARY KEY`<br>`FK -> reviews(review_id)` | - | Foreign key referencing target reviews(review_id) |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | NULL | - | `CURRENT_TIMESTAMP` | Timestamp when like appreciation was registered |

### 10. `watchlists`

**Description:** User-curated film collections and custom watchlists with public/private visibility.

| Column Name | Data Type | Nullable | Key / Constraint | Default Value | Description |
|---|---|---|---|---|---|
| `watchlist_id` | `INTEGER` | **NOT NULL** | `PRIMARY KEY` | `nextval('watchlists_watchlist_id...` | Auto-incrementing surrogate primary key |
| `user_id` | `INTEGER` | **NOT NULL** | `FK -> users(user_id)` | - | Foreign key referencing list owner users(user_id) |
| `name` | `CHARACTER VARYING(100)` | **NOT NULL** | - | - | Curated title of the watchlist collection |
| `description` | `TEXT` | NULL | - | - | Curatorial explanation or thematic description |
| `is_public` | `BOOLEAN` | NULL | - | `true` | Visibility toggle (TRUE = public community, FALSE = private) |
| `is_system_default` | `BOOLEAN` | NULL | - | `false` | Field storing attributes for watchlists |
| `likes_count` | `INTEGER` | NULL | - | `0` | Field storing attributes for watchlists |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | NULL | - | `CURRENT_TIMESTAMP` | Timestamp when collection was created |

### 11. `watchlist_items`

**Description:** Junction table mapping individual catalog movies to specific user watchlists.

| Column Name | Data Type | Nullable | Key / Constraint | Default Value | Description |
|---|---|---|---|---|---|
| `watchlist_id` | `INTEGER` | **NOT NULL** | `PRIMARY KEY`<br>`PRIMARY KEY`<br>`FK -> watchlists(watchlist_id)` | - | Foreign key referencing parent watchlists(watchlist_id) |
| `movie_id` | `INTEGER` | **NOT NULL** | `FK -> movies(movie_id)`<br>`PRIMARY KEY`<br>`PRIMARY KEY` | - | Foreign key referencing cataloged movies(movie_id) |
| `notes` | `CHARACTER VARYING(255)` | NULL | - | - | Field storing attributes for watchlist_items |
| `added_at` | `TIMESTAMP WITH TIME ZONE` | NULL | - | `CURRENT_TIMESTAMP` | Timestamp when movie was added to the list |

### 12. `follows`

**Description:** Social graph directional relationships between platform cinephiles.

| Column Name | Data Type | Nullable | Key / Constraint | Default Value | Description |
|---|---|---|---|---|---|
| `follower_id` | `INTEGER` | **NOT NULL** | `FK -> users(user_id)`<br>`PRIMARY KEY`<br>`PRIMARY KEY` | - | Foreign key referencing subscribing user users(user_id) |
| `following_id` | `INTEGER` | **NOT NULL** | `FK -> users(user_id)`<br>`PRIMARY KEY`<br>`PRIMARY KEY` | - | Foreign key referencing followed target user users(user_id) |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | NULL | - | `CURRENT_TIMESTAMP` | Timestamp when social follow relationship began |

### 13. `activity_logs`

**Description:** Immutable audit trail capturing user actions (reviews, list creations, follows).

| Column Name | Data Type | Nullable | Key / Constraint | Default Value | Description |
|---|---|---|---|---|---|
| `log_id` | `INTEGER` | **NOT NULL** | `PRIMARY KEY` | `nextval('activity_logs_log_id_se...` | Auto-incrementing surrogate primary key |
| `user_id` | `INTEGER` | **NOT NULL** | `FK -> users(user_id)` | - | Foreign key referencing actor users(user_id) |
| `activity_type` | `CHARACTER VARYING(50)` | **NOT NULL** | - | - | Action category (NEW_REVIEW, CREATE_LIST, WATCHLIST_ADD, FOLLOW) |
| `target_id` | `INTEGER` | **NOT NULL** | - | - | Polymorphic target entity ID (movie_id, watchlist_id, or user_id) |
| `metadata` | `JSONB` | NULL | - | `'{}'::jsonb` | Structured JSONB contextual payload with denormalized titles and posters |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | NULL | - | `CURRENT_TIMESTAMP` | Timestamp when action occurred |

### 14. `db_action_traces`

**Description:** CineTrace provenance log header capturing state mutations and Bayesian score drift.

| Column Name | Data Type | Nullable | Key / Constraint | Default Value | Description |
|---|---|---|---|---|---|
| `trace_id` | `INTEGER` | **NOT NULL** | `PRIMARY KEY` | `nextval('db_action_traces_trace_...` | Auto-incrementing surrogate primary key |
| `user_id` | `INTEGER` | **NOT NULL** | `FK -> users(user_id)` | - | Foreign key referencing acting users(user_id) |
| `action_type` | `CHARACTER VARYING(50)` | **NOT NULL** | - | - | Mutation type indicator (e.g. REVIEW_MUTATION) |
| `target_type` | `CHARACTER VARYING(50)` | **NOT NULL** | - | - | Target domain entity classification (e.g. movie) |
| `target_id` | `INTEGER` | **NOT NULL** | - | - | Target entity identifier |
| `mutation_op` | `CHARACTER VARYING(20)` | **NOT NULL** | - | - | SQL mutation operation (INSERT or UPDATE) |
| `initial_score` | `NUMERIC(3, 1)` | NULL | - | - | Downstream Bayesian score prior to mutation |
| `final_score` | `NUMERIC(3, 1)` | NULL | - | - | Downstream Bayesian score after trigger recalculation |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | NULL | - | `CURRENT_TIMESTAMP` | Timestamp when CineTrace provenance record was captured |
| `metadata` | `JSONB` | NULL | - | `'{}'::jsonb` | JSONB audit metadata with snapshot diff details |

### 15. `db_action_trace_steps`

**Description:** Fine-grained execution trace of trigger evaluations, audit logs, and downstream view dependencies.

| Column Name | Data Type | Nullable | Key / Constraint | Default Value | Description |
|---|---|---|---|---|---|
| `step_id` | `INTEGER` | **NOT NULL** | `PRIMARY KEY` | `nextval('db_action_trace_steps_s...` | Auto-incrementing surrogate primary key |
| `trace_id` | `INTEGER` | **NOT NULL** | `FK -> db_action_traces(trace_id)` | - | Foreign key referencing parent db_action_traces(trace_id) |
| `step_order` | `INTEGER` | **NOT NULL** | - | - | Sequence index of execution in transaction (1, 2, 3, 4) |
| `step_title` | `CHARACTER VARYING(150)` | **NOT NULL** | - | - | Human-readable description of trace step |
| `step_type` | `CHARACTER VARYING(50)` | **NOT NULL** | - | - | Execution category (ROW_MUTATION, TRIGGER, AUDIT_LOG, DOWNSTREAM_VIEW) |
| `target_object` | `CHARACTER VARYING(100)` | **NOT NULL** | - | - | Database table or routine targeted (reviews, movies, etc.) |
| `operation` | `CHARACTER VARYING(50)` | **NOT NULL** | - | - | Action verb (INSERT, UPDATE, EXECUTE, EVALUATE, SELECT) |
| `status` | `CHARACTER VARYING(50)` | **NOT NULL** | - | - | Execution status (EXECUTED or SKIPPED) |
| `description` | `TEXT` | **NOT NULL** | - | - | Technical justification of execution outcome |
| `sql_preview` | `TEXT` | NULL | - | - | Raw SQL statement or routine invoked |
| `before_state` | `JSONB` | NULL | - | - | JSONB snapshot of state before step execution |
| `after_state` | `JSONB` | NULL | - | - | JSONB snapshot of state after step execution |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | NULL | - | `CURRENT_TIMESTAMP` | Timestamp when step was recorded |

### 16. `agent_cases`

**Description:** Countercut AI detective case records, claims, debate metrics, and challenge watchlists.

| Column Name | Data Type | Nullable | Key / Constraint | Default Value | Description |
|---|---|---|---|---|---|
| `case_id` | `CHARACTER VARYING(64)` | **NOT NULL** | `PRIMARY KEY` | - | Unique cryptographic case UUID identifier |
| `user_id` | `INTEGER` | **NOT NULL** | `FK -> users(user_id)` | - | Foreign key referencing client users(user_id) |
| `mode` | `CHARACTER VARYING(32)` | **NOT NULL** | - | - | Field storing attributes for agent_cases |
| `subject_movie_ids` | `JSONB` | **NOT NULL** | - | `'[]'::jsonb` | Field storing attributes for agent_cases |
| `opposite_user_id` | `INTEGER` | NULL | `FK -> users(user_id)` | - | Field storing attributes for agent_cases |
| `headline` | `TEXT` | **NOT NULL** | - | - | Field storing attributes for agent_cases |
| `hypothesis` | `TEXT` | **NOT NULL** | - | - | Field storing attributes for agent_cases |
| `factual_metrics` | `JSONB` | **NOT NULL** | - | `'[]'::jsonb` | Structured JSONB array of verified database metrics |
| `claims` | `JSONB` | **NOT NULL** | - | `'[]'::jsonb` | Structured JSONB array of empirical debate claims |
| `alternative_explanations` | `JSONB` | **NOT NULL** | - | `'[]'::jsonb` | Structured JSONB array of counter-theses |
| `limitations` | `JSONB` | **NOT NULL** | - | `'[]'::jsonb` | Structured JSONB array of sample size and methodology limits |
| `tool_receipts` | `JSONB` | **NOT NULL** | - | `'[]'::jsonb` | Structured JSONB audit receipts of agent tool executions |
| `proposed_challenge` | `JSONB` | NULL | - | - | Structured JSONB challenge watchlist configuration |
| `primary_movie` | `JSONB` | NULL | - | - | Field storing attributes for agent_cases |
| `secondary_movie` | `JSONB` | NULL | - | - | Field storing attributes for agent_cases |
| `opposite_critic` | `JSONB` | NULL | - | - | Field storing attributes for agent_cases |
| `connector_label` | `TEXT` | NULL | - | - | Thematic synthesis title explaining taste divergence |
| `is_fallback` | `BOOLEAN` | NULL | - | `false` | Field storing attributes for agent_cases |
| `fallback_reason` | `TEXT` | NULL | - | - | Field storing attributes for agent_cases |
| `model_name` | `CHARACTER VARYING(64)` | NULL | - | `NULL::character varying` | Field storing attributes for agent_cases |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | NULL | - | `CURRENT_TIMESTAMP` | Timestamp of investigation completion |

### 17. `agent_case_evidence`

**Description:** Auditable evidentiary excerpts linked to agent investigation case findings.

| Column Name | Data Type | Nullable | Key / Constraint | Default Value | Description |
|---|---|---|---|---|---|
| `evidence_id` | `CHARACTER VARYING(64)` | **NOT NULL** | `PRIMARY KEY`<br>`PRIMARY KEY` | - | Unique evidence identifier key |
| `case_id` | `CHARACTER VARYING(64)` | **NOT NULL** | `FK -> agent_cases(case_id)`<br>`PRIMARY KEY`<br>`PRIMARY KEY` | - | Foreign key referencing parent agent_cases(case_id) |
| `source_type` | `CHARACTER VARYING(32)` | **NOT NULL** | - | - | Origin entity type (review, watchlist, rating) |
| `target_id` | `INTEGER` | **NOT NULL** | - | - | ID of referenced entity |
| `title` | `CHARACTER VARYING(255)` | **NOT NULL** | - | - | Descriptive evidence title for presentation |
| `snippet` | `TEXT` | NULL | - | - | Exact quote or metric value retrieved from database |
| `metadata` | `JSONB` | **NOT NULL** | - | `'{}'::jsonb` | Field storing attributes for agent_case_evidence |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | NULL | - | `CURRENT_TIMESTAMP` | Timestamp when evidence was linked |


---

## Stored Procedures & Analytical Routines Catalog

| Routine Name | Type | Owner | Parameters | Description |
|---|---|---|---|---|
| `sp_sahib_24bci0292_add_review` | **PROCEDURE** | `SAHIB_24BCI0292` | `p_user_id INT, p_movie_id INT, p_rating NUMERIC, p_text TEXT` | Validates input, upserts review atomically, relies on `trg_update_movie_rating` |
| `fn_sahib_24bci0292_user_summary` | **FUNCTION** | `SAHIB_24BCI0292` | `p_user_id INT` | Returns table of user activity metrics with candidate owner tag |
| `fn_recommend_movies` | **FUNCTION** | System | `p_user_id INT, p_limit INT DEFAULT 6` | Analytical genre-affinity and platform popularity fallback recommendation engine |
| `fn_get_user_analytics` | **FUNCTION** | System | `p_user_id INT` | Computes aggregate rating distribution histogram and watchtime statistics in JSONB |
| `fn_trg_update_movie_rating_stats` | **TRIGGER FUNC** | System | None | Automatically recalculates `movies.avg_rating` and `movies.review_count` |
| `fn_trg_log_review_activity` | **TRIGGER FUNC** | System | None | Generates activity audit entry in `activity_logs` upon new review insertion |
| `fn_trg_update_review_likes` | **TRIGGER FUNC** | System | None | Maintains denormalized `reviews.likes_count` upon like additions/removals |
| `fn_trg_log_watchlist_add` | **TRIGGER FUNC** | System | None | Logs activity audit log event upon movie addition to watchlist |

## Views Catalog

| View Name | Owner | Base Tables | Description |
|---|---|---|---|
| `v_trending_movies` | System | `movies`, `reviews` | Computes Bayesian weighted mean score prior with dynamic review threshold |
| `v_user_leaderboard` | System | `users`, `reviews` | Ranks top community reviewers using `DENSE_RANK()` window function |
| `v_genre_performance` | System | `genres`, `movie_genres`, `reviews` | Aggregates volume and average satisfaction per film genre |
| `v_recent_activity_feed` | System | `activity_logs`, `users`, `movies`, `watchlists` | Polymorphic-safe unified community timeline |
| `v_sahib_24bci0292_top_rated` | `SAHIB_24BCI0292` | `movies` | Candidate-tagged top-rated films view with `owner` provenance column |
| `v_sahib_24bci0292_trending` | `SAHIB_24BCI0292` | `v_trending_movies` | Candidate-tagged wrapper view with `owner` provenance column |
