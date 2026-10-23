-- ============================================================================
-- CINEVERSE: A Social Movie Discovery and Review Platform
-- Database Management Systems (DBMS) - PostgreSQL Schema DDL
-- Author: CineVerse Engineering Team
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DROP EXISTING OBJECTS (FOR CLEAN RE-INSTALLATION)
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS v_recent_activity_feed CASCADE;
DROP VIEW IF EXISTS v_genre_performance CASCADE;
DROP VIEW IF EXISTS v_user_leaderboard CASCADE;
DROP VIEW IF EXISTS v_trending_movies CASCADE;

DROP TRIGGER IF EXISTS trg_update_movie_rating ON reviews CASCADE;
DROP TRIGGER IF EXISTS trg_log_review_activity ON reviews CASCADE;
DROP TRIGGER IF EXISTS trg_update_review_likes ON review_likes CASCADE;
DROP TRIGGER IF EXISTS trg_log_watchlist_add ON watchlist_items CASCADE;

DROP FUNCTION IF EXISTS fn_trg_update_movie_rating_stats() CASCADE;
DROP FUNCTION IF EXISTS fn_trg_log_review_activity() CASCADE;
DROP FUNCTION IF EXISTS fn_trg_update_review_likes() CASCADE;
DROP FUNCTION IF EXISTS fn_trg_log_watchlist_add() CASCADE;
DROP FUNCTION IF EXISTS fn_recommend_movies(INT, INT) CASCADE;
DROP FUNCTION IF EXISTS fn_get_user_analytics(INT) CASCADE;
DROP PROCEDURE IF EXISTS sp_sahib_24bci0292_add_review(INT, INT, NUMERIC, TEXT) CASCADE;

DROP TABLE IF EXISTS app_meta CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS follows CASCADE;
DROP TABLE IF EXISTS watchlist_items CASCADE;
DROP TABLE IF EXISTS watchlists CASCADE;
DROP TABLE IF EXISTS review_likes CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS movie_cast CASCADE;
DROP TABLE IF EXISTS people CASCADE;
DROP TABLE IF EXISTS movie_genres CASCADE;
DROP TABLE IF EXISTS genres CASCADE;
DROP TABLE IF EXISTS movies CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ----------------------------------------------------------------------------
-- 2. TABLE DEFINITIONS (Normalized to 3NF / BCNF)
-- ----------------------------------------------------------------------------

-- APP_META TABLE (Schema Versioning & State Management)
CREATE TABLE app_meta (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- USERS TABLE
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    bio TEXT,
    avatar_url VARCHAR(500) DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    banner_url VARCHAR(500) DEFAULT 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- GENRES TABLE
CREATE TABLE genres (
    genre_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    icon_name VARCHAR(30) DEFAULT 'film'
);

-- MOVIES TABLE
CREATE TABLE movies (
    movie_id SERIAL PRIMARY KEY,
    tmdb_id INT UNIQUE,
    title VARCHAR(255) NOT NULL,
    tagline TEXT,
    overview TEXT NOT NULL,
    release_date DATE NOT NULL,
    runtime INT NOT NULL, -- in minutes
    poster_url VARCHAR(500) NOT NULL,
    backdrop_url VARCHAR(500) NOT NULL,
    trailer_url VARCHAR(500),
    director VARCHAR(150),
    avg_rating NUMERIC(3, 1) DEFAULT 0.0,
    review_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- MOVIE_GENRES (Many-to-Many Bridge Table)
CREATE TABLE movie_genres (
    movie_id INT NOT NULL REFERENCES movies(movie_id) ON DELETE CASCADE,
    genre_id INT NOT NULL REFERENCES genres(genre_id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, genre_id)
);

-- PEOPLE TABLE (Cast, Crew, Directors)
CREATE TABLE people (
    person_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    profile_path VARCHAR(500),
    known_for_department VARCHAR(50) DEFAULT 'Acting',
    biography TEXT
);

-- MOVIE_CAST (Many-to-Many Bridge with Role Attributes)
CREATE TABLE movie_cast (
    movie_id INT NOT NULL REFERENCES movies(movie_id) ON DELETE CASCADE,
    person_id INT NOT NULL REFERENCES people(person_id) ON DELETE CASCADE,
    character_name VARCHAR(150),
    job_role VARCHAR(50) DEFAULT 'Actor', -- 'Actor', 'Director', 'Writer', 'Composer'
    cast_order INT DEFAULT 0,
    PRIMARY KEY (movie_id, person_id, job_role)
);

-- REVIEWS TABLE (Rating required 1.0-10.0, written review optional)
CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    movie_id INT NOT NULL REFERENCES movies(movie_id) ON DELETE CASCADE,
    rating NUMERIC(3, 1) NOT NULL CHECK (rating >= 1.0 AND rating <= 10.0),
    review_text TEXT DEFAULT '',
    has_spoilers BOOLEAN DEFAULT FALSE,
    likes_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_movie_review UNIQUE (user_id, movie_id)
);

-- REVIEW_LIKES TABLE (Normalized source of truth for review likes)
CREATE TABLE review_likes (
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    review_id INT NOT NULL REFERENCES reviews(review_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, review_id)
);

-- WATCHLISTS TABLE (Custom User Curated Lists)
CREATE TABLE watchlists (
    watchlist_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    is_system_default BOOLEAN DEFAULT FALSE,
    likes_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- WATCHLIST_ITEMS TABLE
CREATE TABLE watchlist_items (
    watchlist_id INT NOT NULL REFERENCES watchlists(watchlist_id) ON DELETE CASCADE,
    movie_id INT NOT NULL REFERENCES movies(movie_id) ON DELETE CASCADE,
    notes VARCHAR(255),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (watchlist_id, movie_id)
);

-- FOLLOWS TABLE (Social Graph)
CREATE TABLE follows (
    follower_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    following_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT check_not_self_follow CHECK (follower_id != following_id)
);

-- ACTIVITY_LOGS TABLE (Real-time Audit & Social Feed)
CREATE TABLE activity_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'NEW_REVIEW', 'LIKE_REVIEW', 'CREATE_LIST', 'WATCHLIST_ADD', 'FOLLOW'
    target_id INT NOT NULL, -- movie_id, review_id, watchlist_id, or followed user_id
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. INDEXES FOR PERFORMANCE OPTIMIZATION
-- ----------------------------------------------------------------------------
CREATE INDEX idx_movies_release_date ON movies(release_date DESC);
CREATE INDEX idx_movies_avg_rating ON movies(avg_rating DESC);
CREATE INDEX idx_movies_title ON movies(title);
CREATE INDEX idx_reviews_movie_id ON reviews(movie_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX idx_review_likes_review_id ON review_likes(review_id);
CREATE INDEX idx_watchlist_items_movie_id ON watchlist_items(movie_id);
CREATE INDEX idx_watchlist_items_watchlist_id ON watchlist_items(watchlist_id);
CREATE INDEX idx_movie_genres_genre_id ON movie_genres(genre_id);
CREATE INDEX idx_movie_cast_person_id ON movie_cast(person_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_follows_following_id ON follows(following_id);

-- ----------------------------------------------------------------------------
-- 4. DATABASE TRIGGERS & PL/pgSQL FUNCTIONS
-- ----------------------------------------------------------------------------

-- TRIGGER 1: Automatically recalculate average rating and review count on movie
CREATE OR REPLACE FUNCTION fn_trg_update_movie_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
    target_movie_id INT;
    v_avg NUMERIC(3, 1);
    v_count INT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_movie_id := OLD.movie_id;
    ELSE
        target_movie_id := NEW.movie_id;
    END IF;

    -- Calculate fresh aggregate stats
    SELECT 
        COALESCE(ROUND(AVG(rating), 1), 0.0),
        COUNT(*)
    INTO v_avg, v_count
    FROM reviews
    WHERE movie_id = target_movie_id;

    -- Update movie summary columns
    UPDATE movies
    SET 
        avg_rating = v_avg,
        review_count = v_count
    WHERE movie_id = target_movie_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_movie_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION fn_trg_update_movie_rating_stats();


-- TRIGGER 2: Automatically log activity on review submission
CREATE OR REPLACE FUNCTION fn_trg_log_review_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_movie_title VARCHAR(255);
    v_movie_poster VARCHAR(500);
BEGIN
    SELECT title, poster_url INTO v_movie_title, v_movie_poster FROM movies WHERE movie_id = NEW.movie_id;

    INSERT INTO activity_logs (user_id, activity_type, target_id, metadata)
    VALUES (
        NEW.user_id,
        'NEW_REVIEW',
        NEW.movie_id,
        jsonb_build_object(
            'movie_id', NEW.movie_id,
            'movie_title', v_movie_title,
            'movie_poster', v_movie_poster,
            'rating', NEW.rating,
            'review_id', NEW.review_id,
            'snippet', SUBSTRING(COALESCE(NEW.review_text, '') FROM 1 FOR 80)
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_review_activity
AFTER INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION fn_trg_log_review_activity();


-- TRIGGER 3: Update review like count automatically from review_likes
CREATE OR REPLACE FUNCTION fn_trg_update_review_likes()
RETURNS TRIGGER AS $$
DECLARE
    target_review_id INT;
    v_likes INT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_review_id := OLD.review_id;
    ELSE
        target_review_id := NEW.review_id;
    END IF;

    SELECT COUNT(*) INTO v_likes FROM review_likes WHERE review_id = target_review_id;

    UPDATE reviews
    SET likes_count = v_likes
    WHERE review_id = target_review_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_review_likes
AFTER INSERT OR DELETE ON review_likes
FOR EACH ROW
EXECUTE FUNCTION fn_trg_update_review_likes();


-- TRIGGER 4: Automatically log activity when a movie is added to a watchlist
CREATE OR REPLACE FUNCTION fn_trg_log_watchlist_add()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id INT;
    v_movie_title VARCHAR(255);
    v_movie_poster VARCHAR(500);
    v_watchlist_name VARCHAR(100);
BEGIN
    SELECT user_id, name INTO v_user_id, v_watchlist_name FROM watchlists WHERE watchlist_id = NEW.watchlist_id;
    SELECT title, poster_url INTO v_movie_title, v_movie_poster FROM movies WHERE movie_id = NEW.movie_id;

    IF v_user_id IS NOT NULL THEN
        INSERT INTO activity_logs (user_id, activity_type, target_id, metadata)
        VALUES (
            v_user_id,
            'WATCHLIST_ADD',
            NEW.movie_id,
            jsonb_build_object(
                'movie_id', NEW.movie_id,
                'movie_title', v_movie_title,
                'movie_poster', v_movie_poster,
                'watchlist_id', NEW.watchlist_id,
                'watchlist_name', v_watchlist_name
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_watchlist_add
AFTER INSERT ON watchlist_items
FOR EACH ROW
EXECUTE FUNCTION fn_trg_log_watchlist_add();


-- ----------------------------------------------------------------------------
-- 5. STORED PROCEDURES & ANALYTICAL FUNCTIONS
-- ----------------------------------------------------------------------------

-- STORED PROCEDURE: sp_sahib_24bci0292_add_review
-- Author: Sahib Singh (Register No: 24BCI0292, Tag: SAHIB_24BCI0292)
-- Description: Validates input, inserts or updates the review atomically,
-- and relies on existing triggers (trg_update_movie_rating) for aggregates.
CREATE OR REPLACE PROCEDURE sp_sahib_24bci0292_add_review(
    p_user_id INT,
    p_movie_id INT,
    p_rating NUMERIC,
    p_text TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- 1. Input Validation
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be NULL';
    END IF;

    IF p_movie_id IS NULL THEN
        RAISE EXCEPTION 'Movie ID cannot be NULL';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User with ID % does not exist', p_user_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM movies WHERE movie_id = p_movie_id) THEN
        RAISE EXCEPTION 'Movie with ID % does not exist', p_movie_id;
    END IF;

    IF p_rating IS NULL OR p_rating < 1.0 OR p_rating > 10.0 THEN
        RAISE EXCEPTION 'Rating must be between 1.0 and 10.0 (received %)', p_rating;
    END IF;

    -- 2. Upsert Review (Atomic insert or update)
    -- trg_update_movie_rating automatically recalculates movies.avg_rating & review_count
    INSERT INTO reviews (user_id, movie_id, rating, review_text, updated_at)
    VALUES (p_user_id, p_movie_id, ROUND(p_rating, 1), COALESCE(TRIM(p_text), ''), CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, movie_id)
    DO UPDATE SET
        rating = EXCLUDED.rating,
        review_text = EXCLUDED.review_text,
        updated_at = CURRENT_TIMESTAMP;

END;
$$;



-- FUNCTION: Genre-Affinity & Platform Fallback Recommendation Engine
CREATE OR REPLACE FUNCTION fn_recommend_movies(p_user_id INT, p_limit INT DEFAULT 6)
RETURNS TABLE (
    movie_id INT,
    title VARCHAR(255),
    poster_url VARCHAR(500),
    avg_rating NUMERIC(3, 1),
    recommendation_reason TEXT
) AS $$
DECLARE
    v_affinity_count INT;
BEGIN
    -- Check if user has rated films highly (rating >= 7.0)
    SELECT COUNT(*) INTO v_affinity_count
    FROM reviews r
    WHERE r.user_id = p_user_id AND r.rating >= 7.0;

    IF v_affinity_count > 0 THEN
        -- Personalized Genre-Affinity Recommendations (One row per movie, deterministic)
        RETURN QUERY
        WITH UserTopGenres AS (
            SELECT mg.genre_id, g.name AS genre_name, COUNT(*) AS affinity_score
            FROM reviews r
            JOIN movie_genres mg ON r.movie_id = mg.movie_id
            JOIN genres g ON mg.genre_id = g.genre_id
            WHERE r.user_id = p_user_id AND r.rating >= 7.0
            GROUP BY mg.genre_id, g.name
            ORDER BY affinity_score DESC
            LIMIT 3
        ),
        CandidateMovies AS (
            SELECT DISTINCT ON (m.movie_id)
                m.movie_id,
                m.title,
                m.poster_url,
                m.avg_rating,
                m.review_count,
                utg.genre_name
            FROM movies m
            JOIN movie_genres mg ON m.movie_id = mg.movie_id
            JOIN UserTopGenres utg ON mg.genre_id = utg.genre_id
            WHERE m.movie_id NOT IN (
                SELECT r.movie_id FROM reviews r WHERE r.user_id = p_user_id
            )
            ORDER BY m.movie_id, m.avg_rating DESC
        )
        SELECT 
            cm.movie_id,
            cm.title,
            cm.poster_url,
            cm.avg_rating,
            ('Recommended because you enjoy ' || cm.genre_name || ' films')::TEXT AS recommendation_reason
        FROM CandidateMovies cm
        ORDER BY cm.avg_rating DESC, cm.review_count DESC, cm.movie_id ASC
        LIMIT p_limit;
    ELSE
        -- Cold-Start Fallback: Highest rated community favorites not yet reviewed by user
        RETURN QUERY
        SELECT 
            m.movie_id,
            m.title,
            m.poster_url,
            m.avg_rating,
            ('Community Favorite: Top-rated recommendation for new cinephiles')::TEXT AS recommendation_reason
        FROM movies m
        WHERE m.movie_id NOT IN (
            SELECT r.movie_id FROM reviews r WHERE r.user_id = p_user_id
        )
        ORDER BY m.avg_rating DESC, m.review_count DESC, m.movie_id ASC
        LIMIT p_limit;
    END IF;
END;
$$ LANGUAGE plpgsql;


-- FUNCTION: User Profile & Watch Analytics Aggregator
CREATE OR REPLACE FUNCTION fn_get_user_analytics(p_user_id INT)
RETURNS JSONB AS $$
DECLARE
    v_total_reviews INT;
    v_avg_rating NUMERIC(4, 2); -- Safe for 10.00 average!
    v_total_runtime_mins INT;
    v_total_watchlists INT;
    v_followers_count INT;
    v_following_count INT;
    v_rating_distribution JSONB;
    v_top_genres JSONB;
BEGIN
    -- Basic counts
    SELECT 
        COUNT(*),
        COALESCE(AVG(r.rating), 0.0),
        COALESCE(SUM(m.runtime), 0)
    INTO v_total_reviews, v_avg_rating, v_total_runtime_mins
    FROM reviews r
    JOIN movies m ON r.movie_id = m.movie_id
    WHERE r.user_id = p_user_id;

    -- Watchlists
    SELECT COUNT(*) INTO v_total_watchlists FROM watchlists WHERE user_id = p_user_id;

    -- Social
    SELECT COUNT(*) INTO v_followers_count FROM follows WHERE following_id = p_user_id;
    SELECT COUNT(*) INTO v_following_count FROM follows WHERE follower_id = p_user_id;

    -- Rating distribution histogram (1-10)
    SELECT jsonb_object_agg(b.val::TEXT, COALESCE(counts.c, 0))
    INTO v_rating_distribution
    FROM generate_series(1, 10) AS b(val)
    LEFT JOIN (
        SELECT FLOOR(rating)::INT AS bucket, COUNT(*) AS c
        FROM reviews
        WHERE user_id = p_user_id
        GROUP BY FLOOR(rating)
    ) counts ON b.val = counts.bucket;

    -- Top genres
    SELECT jsonb_agg(genre_row)
    INTO v_top_genres
    FROM (
        SELECT g.name, COUNT(*) as count
        FROM reviews r
        JOIN movie_genres mg ON r.movie_id = mg.movie_id
        JOIN genres g ON mg.genre_id = g.genre_id
        WHERE r.user_id = p_user_id
        GROUP BY g.name
        ORDER BY count DESC
        LIMIT 5
    ) genre_row;

    RETURN jsonb_build_object(
        'total_reviews', v_total_reviews,
        'avg_rating', ROUND(v_avg_rating, 1),
        'total_runtime_hours', ROUND(v_total_runtime_mins / 60.0, 1),
        'total_watchlists', v_total_watchlists,
        'followers_count', v_followers_count,
        'following_count', v_following_count,
        'rating_distribution', COALESCE(v_rating_distribution, '{}'::jsonb),
        'top_genres', COALESCE(v_top_genres, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql;


-- ----------------------------------------------------------------------------
-- 6. ADVANCED VIEWS & WINDOW FUNCTIONS
-- ----------------------------------------------------------------------------

-- VIEW 1: Trending Movies using Bayesian Weighted Score (True Rated Prior)
CREATE OR REPLACE VIEW v_trending_movies AS
WITH GlobalStats AS (
    SELECT 
        COALESCE(AVG(r.rating), 7.5) AS global_mean_rating,
        3.0 AS min_reviews_threshold
    FROM reviews r
)
SELECT 
    m.movie_id,
    m.title,
    m.tagline,
    m.release_date,
    m.runtime,
    m.poster_url,
    m.backdrop_url,
    m.director,
    m.avg_rating,
    m.review_count,
    ROUND(
        (
            (m.review_count / (m.review_count + gs.min_reviews_threshold)) * m.avg_rating +
            (gs.min_reviews_threshold / (m.review_count + gs.min_reviews_threshold)) * gs.global_mean_rating
        )::NUMERIC, 
        2
    ) AS bayesian_score
FROM movies m
CROSS JOIN GlobalStats gs
ORDER BY bayesian_score DESC, m.review_count DESC;


-- VIEW 2: User Leaderboard with Window Functions (DENSE_RANK)
CREATE OR REPLACE VIEW v_user_leaderboard AS
SELECT 
    u.user_id,
    u.username,
    u.display_name,
    u.avatar_url,
    COUNT(r.review_id) AS total_reviews,
    COALESCE(SUM(r.likes_count), 0) AS total_likes_received,
    COALESCE(ROUND(AVG(r.rating), 1), 0.0) AS avg_rating_given,
    DENSE_RANK() OVER (ORDER BY COUNT(r.review_id) DESC, COALESCE(SUM(r.likes_count), 0) DESC) AS rank
FROM users u
LEFT JOIN reviews r ON u.user_id = r.user_id
GROUP BY u.user_id, u.username, u.display_name, u.avatar_url;


-- VIEW 3: Genre Performance & Popularity
CREATE OR REPLACE VIEW v_genre_performance AS
SELECT 
    g.genre_id,
    g.name AS genre_name,
    g.slug,
    COUNT(DISTINCT mg.movie_id) AS total_movies,
    COUNT(r.review_id) AS total_reviews,
    COALESCE(ROUND(AVG(r.rating), 2), 0.0) AS avg_genre_rating
FROM genres g
LEFT JOIN movie_genres mg ON g.genre_id = mg.genre_id
LEFT JOIN reviews r ON mg.movie_id = r.movie_id
GROUP BY g.genre_id, g.name, g.slug
ORDER BY total_movies DESC, total_reviews DESC;


-- VIEW 4: Unified Activity Feed with Safe Entity Joins (No Polymorphic Collision)
CREATE OR REPLACE VIEW v_recent_activity_feed AS
SELECT 
    al.log_id,
    al.activity_type,
    al.created_at,
    u.user_id,
    u.username,
    u.display_name,
    u.avatar_url,
    al.target_id,
    al.metadata,
    m.movie_id,
    COALESCE(m.title, al.metadata->>'movie_title') AS movie_title,
    COALESCE(m.poster_url, al.metadata->>'movie_poster') AS movie_poster,
    w.watchlist_id,
    COALESCE(w.name, al.metadata->>'watchlist_name') AS watchlist_name,
    tu.user_id AS target_user_id,
    tu.username AS target_username,
    tu.display_name AS target_display_name
FROM activity_logs al
JOIN users u ON al.user_id = u.user_id
LEFT JOIN movies m ON (
    CASE 
        WHEN al.activity_type IN ('NEW_REVIEW', 'WATCHLIST_ADD') THEN al.target_id = m.movie_id
        WHEN al.metadata ? 'movie_id' THEN (al.metadata->>'movie_id')::INT = m.movie_id
        ELSE FALSE
    END
)
LEFT JOIN watchlists w ON (
    CASE 
        WHEN al.activity_type = 'CREATE_LIST' THEN al.target_id = w.watchlist_id
        WHEN al.metadata ? 'watchlist_id' THEN (al.metadata->>'watchlist_id')::INT = w.watchlist_id
        ELSE FALSE
    END
)
LEFT JOIN users tu ON (
    al.activity_type = 'FOLLOW' AND al.target_id = tu.user_id
)
ORDER BY al.created_at DESC;


-- ----------------------------------------------------------------------------
-- 7. CINETRACE: Provenance & Mutation Trace Architecture
-- ----------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_trace_user_id ON db_action_traces(user_id);
CREATE INDEX IF NOT EXISTS idx_trace_target ON db_action_traces(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_trace_steps_trace ON db_action_trace_steps(trace_id, step_order);

-- ----------------------------------------------------------------------------
-- 8. COUNTERCUT: Agentic Film-Taste Investigation Tables
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_cases (
    case_id VARCHAR(64) PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    mode VARCHAR(32) NOT NULL, -- 'taste_contradiction' | 'opposite_critic'
    subject_movie_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    opposite_user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    headline TEXT NOT NULL,
    hypothesis TEXT NOT NULL,
    factual_metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
    claims JSONB NOT NULL DEFAULT '[]'::jsonb,
    alternative_explanations JSONB NOT NULL DEFAULT '[]'::jsonb,
    limitations JSONB NOT NULL DEFAULT '[]'::jsonb,
    tool_receipts JSONB NOT NULL DEFAULT '[]'::jsonb,
    proposed_challenge JSONB DEFAULT NULL,
    primary_movie JSONB DEFAULT NULL,
    secondary_movie JSONB DEFAULT NULL,
    opposite_critic JSONB DEFAULT NULL,
    connector_label TEXT DEFAULT NULL,
    is_fallback BOOLEAN DEFAULT FALSE,
    fallback_reason TEXT DEFAULT NULL,
    model_name VARCHAR(64) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_case_evidence (
    evidence_id VARCHAR(64) NOT NULL,
    case_id VARCHAR(64) NOT NULL REFERENCES agent_cases(case_id) ON DELETE CASCADE,
    source_type VARCHAR(32) NOT NULL, -- 'review' | 'movie' | 'metric'
    target_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    snippet TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (case_id, evidence_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_cases_user ON agent_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_cases_created ON agent_cases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_case_evidence_case ON agent_case_evidence(case_id);


