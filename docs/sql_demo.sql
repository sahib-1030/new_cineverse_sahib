-- ============================================================================
-- CINEVERSE DATABASE DEMONSTRATION & SQL OBSERVABILITY SCRIPT
-- ============================================================================
-- Candidate / Owner: SAHIB_24BCI0292 (Sahib Singh, Register No: 24BCI0292)
-- Course: Database Management Systems (DBMS) Laboratory
-- Engine: PostgreSQL 16+ / Embedded PostgreSQL (PGlite)
--
-- Instructions:
--   This file contains complete demonstrations of database operations.
--   Each section begins with: SELECT 'SAHIB_24BCI0292' AS owner, now();
--   All mutations are designed to be idempotent and re-runnable.
-- ============================================================================


-- ============================================================================
-- SECTION 1: CRUD OPERATIONS (CREATE, READ, UPDATE, DELETE)
-- Demonstrates atomic lifecycle of a database record using temporary data.
-- ============================================================================
SELECT 'SAHIB_24BCI0292' AS owner, now();

-- 1.1 CREATE (INSERT)
INSERT INTO users (username, email, password_hash, display_name, bio)
VALUES (
    'demo_crud_user',
    'demo_crud@cineverse.io',
    'scrypt:demo:salt12345',
    'CRUD Demo User',
    'Temporary record for CRUD demonstration'
)
ON CONFLICT (username) DO UPDATE 
SET display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio;

-- 1.2 READ (SELECT)
SELECT 'SAHIB_24BCI0292' AS owner, user_id, username, email, display_name, created_at
FROM users
WHERE username = 'demo_crud_user';

-- 1.3 UPDATE
UPDATE users
SET display_name = 'CRUD Demo User (Updated)',
    bio = 'Updated bio demonstrating SQL UPDATE statement'
WHERE username = 'demo_crud_user';

SELECT 'SAHIB_24BCI0292' AS owner, user_id, username, display_name, bio
FROM users
WHERE username = 'demo_crud_user';

-- 1.4 DELETE
DELETE FROM users
WHERE username = 'demo_crud_user';

-- Verify Deletion
SELECT 'SAHIB_24BCI0292' AS owner, COUNT(*)::INT AS remaining_matching_rows
FROM users
WHERE username = 'demo_crud_user';


-- ============================================================================
-- SECTION 2: RELATIONAL JOINS (INNER JOIN AND LEFT JOIN)
-- Demonstrates multi-table relational navigation across normalized 3NF schema.
-- ============================================================================
SELECT 'SAHIB_24BCI0292' AS owner, now();

-- 2.1 INNER JOIN: Movies with their assigned Genres via many-to-many bridge table
SELECT 
    'SAHIB_24BCI0292' AS owner,
    m.movie_id,
    m.title,
    m.director,
    g.name AS genre_name,
    g.slug AS genre_slug
FROM movies m
INNER JOIN movie_genres mg ON m.movie_id = mg.movie_id
INNER JOIN genres g ON mg.genre_id = g.genre_id
ORDER BY m.movie_id ASC, g.name ASC
LIMIT 10;

-- 2.2 LEFT JOIN: All users with their review activity (identifies active and non-active users)
SELECT 
    'SAHIB_24BCI0292' AS owner,
    u.user_id,
    u.username,
    u.display_name,
    COUNT(r.review_id)::INT AS reviews_written,
    COALESCE(ROUND(AVG(r.rating), 2), 0.00) AS avg_rating_given,
    CASE 
        WHEN COUNT(r.review_id) = 0 THEN 'Silent Reader'
        WHEN COUNT(r.review_id) < 5 THEN 'Casual Reviewer'
        ELSE 'Prolific Critic'
    END AS reviewer_tier
FROM users u
LEFT JOIN reviews r ON u.user_id = r.user_id
GROUP BY u.user_id, u.username, u.display_name
ORDER BY reviews_written DESC, u.user_id ASC;


-- ============================================================================
-- SECTION 3: AGGREGATE QUERIES (GROUP BY AND HAVING)
-- Demonstrates SQL aggregate functions (COUNT, AVG, MIN, MAX) with filtering.
-- ============================================================================
SELECT 'SAHIB_24BCI0292' AS owner, now();

-- Directors with at least 2 cataloged movies and an average movie rating > 8.0
SELECT 
    'SAHIB_24BCI0292' AS owner,
    m.director,
    COUNT(m.movie_id)::INT AS directed_movies_count,
    ROUND(AVG(m.avg_rating), 2) AS director_mean_rating,
    ROUND(AVG(m.runtime), 0)::INT AS avg_runtime_minutes,
    SUM(m.review_count)::INT AS total_community_reviews
FROM movies m
WHERE m.director IS NOT NULL
GROUP BY m.director
HAVING COUNT(m.movie_id) >= 2 AND AVG(m.avg_rating) >= 7.5
ORDER BY director_mean_rating DESC, total_community_reviews DESC;


-- ============================================================================
-- SECTION 4: SUBQUERIES (SCALAR, IN-LIST, AND CORRELATED)
-- Demonstrates nested SQL query logic.
-- ============================================================================
SELECT 'SAHIB_24BCI0292' AS owner, now();

-- 4.1 Scalar Subquery: Movies rated strictly above the global platform average
SELECT 
    'SAHIB_24BCI0292' AS owner,
    m.movie_id,
    m.title,
    m.director,
    m.avg_rating,
    (SELECT ROUND(AVG(avg_rating), 2) FROM movies) AS platform_overall_average,
    ROUND(m.avg_rating - (SELECT AVG(avg_rating) FROM movies), 2) AS rating_delta
FROM movies m
WHERE m.avg_rating > (SELECT AVG(avg_rating) FROM movies)
ORDER BY m.avg_rating DESC
LIMIT 8;

-- 4.2 Correlated Subquery: Find reviews where user gave a higher rating than the movie's own average
SELECT 
    'SAHIB_24BCI0292' AS owner,
    r.review_id,
    u.username,
    m.title AS movie_title,
    r.rating AS user_rating,
    m.avg_rating AS movie_avg_rating,
    ROUND(r.rating - m.avg_rating, 1) AS bullish_divergence
FROM reviews r
JOIN users u ON r.user_id = u.user_id
JOIN movies m ON r.movie_id = m.movie_id
WHERE r.rating > (
    SELECT sub_m.avg_rating 
    FROM movies sub_m 
    WHERE sub_m.movie_id = r.movie_id
)
ORDER BY bullish_divergence DESC
LIMIT 8;


-- ============================================================================
-- SECTION 5: DATABASE VIEWS DEMONSTRATION
-- Queries each standard and candidate-tagged view in the database schema.
-- ============================================================================
SELECT 'SAHIB_24BCI0292' AS owner, now();

-- 5.1 View: v_trending_movies (Bayesian weighted score prior)
SELECT 
    'SAHIB_24BCI0292' AS owner,
    vt.movie_id,
    vt.title,
    vt.director,
    vt.avg_rating,
    vt.review_count,
    vt.bayesian_score
FROM v_trending_movies vt
LIMIT 5;

-- 5.2 View: v_user_leaderboard (DENSE_RANK window function)
SELECT 
    'SAHIB_24BCI0292' AS owner,
    vl.user_id,
    vl.username,
    vl.display_name,
    vl.total_reviews,
    vl.total_likes_received,
    vl.avg_rating_given,
    vl.rank
FROM v_user_leaderboard vl
LIMIT 5;

-- 5.3 View: v_genre_performance (Category-level aggregation)
SELECT 
    'SAHIB_24BCI0292' AS owner,
    vg.genre_name,
    vg.total_movies,
    vg.total_reviews,
    vg.avg_genre_rating
FROM v_genre_performance vg
LIMIT 5;

-- 5.4 View: v_recent_activity_feed (Polymorphic-safe timeline)
SELECT 
    'SAHIB_24BCI0292' AS owner,
    vf.log_id,
    vf.activity_type,
    vf.username,
    COALESCE(vf.movie_title, vf.watchlist_name, vf.target_username, 'N/A') AS target_name,
    vf.created_at
FROM v_recent_activity_feed vf
LIMIT 5;

-- 5.5 View: v_sahib_24bci0292_top_rated (Candidate-tagged top rated view)
SELECT 
    owner,
    movie_id,
    title,
    director,
    avg_rating,
    review_count,
    rank
FROM v_sahib_24bci0292_top_rated
LIMIT 5;

-- 5.6 Function: fn_sahib_24bci0292_user_summary (Candidate-tagged summary routine)
SELECT * FROM fn_sahib_24bci0292_user_summary(1);


-- ============================================================================
-- SECTION 6: TRIGGER DEMONSTRATION (BEFORE AND AFTER VALUES)
-- Proves trg_update_movie_rating and trg_log_review_activity fire automatically.
-- ============================================================================
SELECT 'SAHIB_24BCI0292' AS owner, now();

-- We demonstrate trigger effect on a dedicated test row
DO $$
DECLARE
    v_movie_id INT := 1;
    v_test_user_id INT := 6;
    v_before_count INT;
    v_before_rating NUMERIC;
    v_after_count INT;
    v_after_rating NUMERIC;
    v_log_count INT;
BEGIN
    -- 1. Read BEFORE state
    SELECT review_count, avg_rating INTO v_before_count, v_before_rating
    FROM movies WHERE movie_id = v_movie_id;

    RAISE NOTICE '>>> [TRIGGER DEMO BEFORE] Movie #% has review_count=%, avg_rating=%',
        v_movie_id, v_before_count, v_before_rating;

    -- 2. Execute Review Mutation (Insert or Update)
    INSERT INTO reviews (user_id, movie_id, rating, review_text, updated_at)
    VALUES (v_test_user_id, v_movie_id, 9.8, 'Trigger Verification Review', CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, movie_id)
    DO UPDATE SET rating = 9.8, review_text = 'Trigger Verification Review (Updated)', updated_at = CURRENT_TIMESTAMP;

    -- 3. Read AFTER state
    SELECT review_count, avg_rating INTO v_after_count, v_after_rating
    FROM movies WHERE movie_id = v_movie_id;

    RAISE NOTICE '>>> [TRIGGER DEMO AFTER] Movie #% now has review_count=%, avg_rating=%',
        v_movie_id, v_after_count, v_after_rating;

    -- 4. Check activity log trigger trg_log_review_activity
    SELECT COUNT(*) INTO v_log_count
    FROM activity_logs
    WHERE user_id = v_test_user_id AND target_id = v_movie_id;

    RAISE NOTICE '>>> [TRIGGER AUDIT LOG] activity_logs count for user #% is %',
        v_test_user_id, v_log_count;
END $$;

-- Inspect the updated movie state
SELECT 
    'SAHIB_24BCI0292' AS owner,
    movie_id,
    title,
    avg_rating,
    review_count,
    'Automatically recalculated by trg_update_movie_rating' AS trigger_status
FROM movies
WHERE movie_id = 1;


-- ============================================================================
-- SECTION 7: STORED PROCEDURE DEMONSTRATION (CALL SUCCESS & FAILING CASE)
-- Demonstrates real CREATE PROCEDURE sp_sahib_24bci0292_add_review invocation.
-- ============================================================================
SELECT 'SAHIB_24BCI0292' AS owner, now();

-- 7.1 Successful Stored Procedure Call
CALL sp_sahib_24bci0292_add_review(
    1::INT,
    2::INT,
    9.5::NUMERIC,
    'Procedure test: Stunning visual scale and Hans Zimmer score.'::TEXT
);

-- Verify Result of Successful Call
SELECT 
    'SAHIB_24BCI0292' AS owner,
    r.review_id,
    r.user_id,
    r.movie_id,
    r.rating,
    r.review_text,
    r.updated_at
FROM reviews r
WHERE r.user_id = 1 AND r.movie_id = 2;

-- 7.2 Failing Stored Procedure Call (Input Validation: Rating Out of Range > 10.0)
-- Handled inside a PL/pgSQL block to demonstrate expected exception without aborting script.
DO $$
BEGIN
    RAISE NOTICE '>>> Attempting CALL sp_sahib_24bci0292_add_review with invalid rating (15.5)...';
    CALL sp_sahib_24bci0292_add_review(
        1::INT,
        2::INT,
        15.5::NUMERIC,
        'Should fail validation'::TEXT
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '>>> SUCCESSFUL VALIDATION CATCH: Procedure correctly rejected invalid input: [%] %',
        SQLSTATE, SQLERRM;
END $$;

-- 7.3 Failing Stored Procedure Call (Input Validation: Nonexistent User)
DO $$
BEGIN
    RAISE NOTICE '>>> Attempting CALL sp_sahib_24bci0292_add_review with nonexistent user_id (99999)...';
    CALL sp_sahib_24bci0292_add_review(
        99999::INT,
        2::INT,
        8.0::NUMERIC,
        'Should fail validation'::TEXT
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '>>> SUCCESSFUL VALIDATION CATCH: Procedure correctly rejected nonexistent foreign key: [%] %',
        SQLSTATE, SQLERRM;
END $$;


-- ============================================================================
-- SECTION 8: TRANSACTION WITH COMMIT (ACID DURABILITY DEMO)
-- Demonstrates multi-table transaction that permanently commits changes.
-- ============================================================================
SELECT 'SAHIB_24BCI0292' AS owner, now();

BEGIN;

-- Insert a curated watchlist and an associated item
INSERT INTO watchlists (watchlist_id, user_id, name, description, is_public)
VALUES (9991, 1, 'Transaction Commit Demo Watchlist', 'Demonstrating ACID COMMIT', TRUE)
ON CONFLICT (watchlist_id) DO UPDATE 
SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO watchlist_items (watchlist_id, movie_id)
VALUES (9991, 1)
ON CONFLICT (watchlist_id, movie_id) DO NOTHING;

COMMIT;

-- Verify Durability After Commit
SELECT 
    'SAHIB_24BCI0292' AS owner,
    w.watchlist_id,
    w.name,
    COUNT(wi.movie_id)::INT AS total_items,
    'COMMITTED PERMANENTLY' AS transaction_outcome
FROM watchlists w
JOIN watchlist_items wi ON w.watchlist_id = wi.watchlist_id
WHERE w.watchlist_id = 9991
GROUP BY w.watchlist_id, w.name;

-- Clean up demo watchlist so script remains idempotent
DELETE FROM watchlists WHERE watchlist_id = 9991;


-- ============================================================================
-- SECTION 9: TRANSACTION WITH ROLLBACK (ACID ATOMICITY DEMO)
-- Demonstrates failed operation where all mutations are discarded completely.
-- ============================================================================
SELECT 'SAHIB_24BCI0292' AS owner, now();

BEGIN;

-- Insert a test movie inside an uncommitted transaction
INSERT INTO movies (
    movie_id, tmdb_id, title, overview, release_date, runtime, 
    poster_url, backdrop_url, director, avg_rating, review_count
) VALUES (
    8881, 9998881, 'Temporary Phantom Film', 'Will be discarded via ROLLBACK', 
    '2026-10-23', 120, 'https://example.com/p.jpg', 'https://example.com/b.jpg',
    'Phantom Director', 9.9, 1
);

-- Prove the row is visible INSIDE this transaction
SELECT 
    'SAHIB_24BCI0292' AS owner,
    movie_id,
    title,
    'Visible inside active transaction before ROLLBACK' AS status
FROM movies
WHERE movie_id = 8881;

-- Now Roll Back the Transaction
ROLLBACK;

-- Verify the row has been completely discarded (Atomicity Guarantee)
SELECT 
    'SAHIB_24BCI0292' AS owner,
    COUNT(*)::INT AS matching_movies_after_rollback,
    'CONFIRMED DISCARDED: Zero rows persisted' AS atomicity_proof
FROM movies
WHERE movie_id = 8881;


-- ============================================================================
-- SECTION 10: QUERY EXECUTION PLAN & SECONDARY INDEX USAGE (EXPLAIN ANALYZE)
-- Demonstrates query optimization using index idx_reviews_movie_id.
-- ============================================================================
SELECT 'SAHIB_24BCI0292' AS owner, now();

-- EXPLAIN ANALYZE on query filtering by movie_id (uses secondary index idx_reviews_movie_id)
EXPLAIN ANALYZE
SELECT 
    r.review_id,
    r.user_id,
    r.rating,
    r.review_text,
    r.created_at
FROM reviews r
WHERE r.movie_id = 1
ORDER BY r.created_at DESC;

-- EXPLAIN ANALYZE on movies ordered by release_date (uses secondary index idx_movies_release_date)
EXPLAIN ANALYZE
SELECT 
    m.movie_id,
    m.title,
    m.release_date,
    m.avg_rating
FROM movies m
WHERE m.release_date >= '2020-01-01'
ORDER BY m.release_date DESC;

-- Final Verification Banner
SELECT 
    'SAHIB_24BCI0292' AS owner,
    'ALL 10 SQL DEMONSTRATION SECTIONS EXECUTED SUCCESSFULLY' AS status,
    now() AS completed_at;
