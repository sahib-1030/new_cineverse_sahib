# CineVerse Codebase Audit Report

**Auditor / Candidate:** Sahib Singh (Register Number: `24BCI0292`, Identifier: `SAHIB_24BCI0292`)  
**Repository:** `github.com/sahib-1030/new_cineverse_sahib`  
**Date of Audit:** October 23, 2026  
**Purpose:** Honest, rigorous audit comparing claims made in project documentation and the written lab report against the actual implementation in the repository.

---

## 1. Audit Matrix: Claim vs. Reality

| # | Claim | Where Claimed | Reality in the Code | Evidence (File Path) | Status |
|---|---|---|---|---|---|
| **1** | Prisma/ORM is used for database access | Report Sec 3.5, README stack table | No ORM is installed or used. `package.json` contains only `pg` and `@electric-sql/pglite`. All database queries are executed via raw SQL strings in `src/lib/db.ts` (`query()`, `withTransaction()`). | `package.json:15-30`<br>`src/lib/db.ts:1-50` | **FALSE** |
| **2** | A `prisma/schema.prisma` file exists and is actually used | Report Sec 3.5 code block | No `prisma/` directory or `schema.prisma` file exists anywhere in the repository. | Repository root (`Test-Path "prisma"` = False) | **FALSE** |
| **3** | The 4 triggers, 4 views, and 2 analytical functions exist in `db/schema.sql` | Report Sec 5.1–5.3, README "Notable database behavior" | Exactly 4 triggers exist (`trg_update_movie_rating`, `trg_log_review_activity`, `trg_update_review_likes`, `trg_log_watchlist_add`). Exactly 4 views exist (`v_trending_movies`, `v_user_leaderboard`, `v_genre_performance`, `v_recent_activity_feed`). Exactly 2 standalone analytical functions exist (`fn_recommend_movies`, `fn_get_user_analytics`) plus 4 trigger functions. | `db/schema.sql:201-594` | **TRUE** |
| **4** | There is a real `CREATE PROCEDURE` (not just functions) | Report Sec 5.3, Table 1 | Zero `CREATE PROCEDURE` statements exist. All routines are defined as `CREATE FUNCTION ... RETURNS ...` invoked via `SELECT`. In PostgreSQL, stored procedures are created via `CREATE PROCEDURE` and executed with `CALL`. | `db/schema.sql:344-484` | **FALSE** |
| **5** | `users.role` column exists with roles `admin`/`critic`/`user`, and role checks exist in sidebar, middleware, and API routes | Report Sec 3.2, Sec 7.2–7.3 | In `db/schema.sql`, the `users` table has NO `role` column. No `middleware.ts` exists. In `src/components/Sidebar.tsx`, all links (including DB Studio and CineTrace) render unconditionally for every visitor without any role check. In API routes, there are zero user role authorization checks. | `db/schema.sql:53-63`<br>`src/components/Sidebar.tsx:90-165`<br>`src/middleware.ts` (missing) | **FALSE** |
| **6** | `POST /api/db/query` is admin-only and read-only | Report Sec 7.3, Table 1 | The endpoint is actually located at `POST /api/dbms/execute` (there is no `/api/db/query`). It IS strictly read-only: regex allows only `SELECT|WITH|EXPLAIN`, rejects semicolons and `ANALYZE`, and executes within `SET TRANSACTION READ ONLY`. However, it is NOT admin-only: any signed-in user can execute it without role checks. | `src/app/api/dbms/execute/route.ts:12-50` | **PARTLY** |
| **7** | Pagination exists in the UI and APIs | Report Sec 6.5 | Several APIs accept a `limit` query parameter, but zero APIs accept a `page` or `offset` parameter, and none use SQL `OFFSET`. The UI has zero pagination controls (no Next/Prev buttons, page numbers, or infinite scroll). | `src/app/api/movies/route.ts:13,81`<br>`src/app/api/reviews/route.ts:10,47`<br>`src/app/feed/page.tsx` | **FALSE** |
| **8** | Zod validation exists on every API route | Report Sec 6.6, Table 1 | `zod` is listed in `package.json`, but is imported zero times across all files in `src/`. API routes validate incoming bodies using ad-hoc `if (!field)` manual checks. | `package.json:29`<br>`src/app/api/**/*.ts` (0 zod imports) | **FALSE** |
| **9** | Passwords hashed with `scrypt`; session cookie flags (`HttpOnly`, `SameSite`, `Secure`); missing session secret behavior | Report Sec 7.1, Sec 7.4 | Passwords are hashed using `crypto.scryptSync` with a 16-byte random salt and verified with `crypto.timingSafeEqual`. Cookies use `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, and `secure: process.env.NODE_ENV === 'production'`. If `SESSION_SECRET` is missing in production, `getSessionSecret()` throws an unhandled Security Exception; in development, it defaults to a hardcoded fallback string. | `src/lib/auth.ts:7-15, 27-51, 146-155` | **TRUE** |
| **10** | `.gitignore` covers `.env` and `.env.local`; secrets scan of working tree and git history | Report Sec 7.5, Sec 8.1 | `.gitignore` rules `.env` and `.env.*` (except `!.env.example`) properly ignore local secrets. Git commit history (`ca134c6`, `4947797`) contains only `.env.example` with empty keys. No live API keys, session secrets, or production database passwords exist in git history. | `.gitignore:37-39`<br>`git log -p` | **TRUE** |
| **11** | Git: 2+ branches (`main` and `dev`), 50+ progressive commits | Report Sec 8.1 | There is only 1 branch: `main` (no `dev` branch exists). The total commit count across all branches (`git rev-list --count --all`) is exactly **2 commits**, not 50+. | `git branch -a`<br>`git rev-list --count --all` | **FALSE** |
| **12** | `.github/workflows` exists with automated CI/CD pipeline | Report Sec 9.1 | The `.github/` folder does not exist at all in the repository. | Repository root (`Test-Path ".github"` = False) | **FALSE** |
| **13** | Dockerfile or docker-compose exists | Lab QP Rubric Item 6 | Neither `Dockerfile` nor `docker-compose.yml` exists in the repository. | Repository root | **FALSE** |
| **14** | Database backup scripts exist (`pg_dump` / `pg_restore`) | Report Sec 8.2 | No backup/recovery executable scripts exist in `scripts/` or `package.json`. Only manual commands were described in the written report text. | `scripts/`<br>`package.json` | **FALSE** |
| **15** | Database used at runtime (PGlite vs. external Postgres) and `DATABASE_URL` handling | README architecture, Report Sec 1.6 | In `src/lib/db.ts`, if `DATABASE_URL` is set, the application initializes a `pg.Pool` connecting to external PostgreSQL. If `DATABASE_URL` is unset, it automatically initializes and queries embedded `@electric-sql/pglite` stored on disk in `.pglite_db/`. | `src/lib/db.ts:13-37` | **TRUE** |
| **16** | Gemini model name used in the code | Report Sec 1.6, README | The model string is configured as `process.env.GEMINI_MODEL || 'gemini-3.8-flash'`. Note that `'gemini-3.8-flash'` is a synthetic placeholder name rather than an official Google Gemini API release (e.g. `gemini-1.5-flash` or `gemini-2.0-flash`). | `src/lib/countercut/agent.ts:20`<br>`src/app/api/mood/route.ts:107`<br>`src/app/countercut/page.tsx:209` | **TRUE** |
| **17** | 71-check QA suite: real check count and `npm test` result | Report Sec 9.3, README | `scripts/qa-verify.js` defines **72 assertions** across 15 test categories. However, executing `npm test` fails with exit code 1 on Node v24 (`Fatal process out of memory: Zone` / OpenSSL `scryptSync` memory ceiling) during Test 2. The test suite does not run to completion out-of-the-box on the current runtime. | `scripts/qa-verify.js:60-673`<br>`npm test` execution log | **PARTLY / FAILS** |

---

## 2. Priority Ranking of Deficiencies (What Needs to be Fixed)

To align the codebase with the evaluation rubric and eliminate fabricated claims before final grading, the following items must be resolved in order of priority:

### Priority 1: High Exam Impact (Rubric Compliance & Integrity)
1. **Users Table `role` Column & RBAC (Rubric Item 5 - 5 Marks):**
   - Add `role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'critic', 'user'))` to `db/schema.sql` and the database seed.
   - Enforce role verification on administrative endpoints (`/api/dbms/execute`) and conditionally hide admin navigation items in `src/components/Sidebar.tsx` when the user is not an administrator.
2. **Real PostgreSQL `CREATE PROCEDURE` (Rubric Item 3 - 7 Marks):**
   - The rubric specifically demands *"At least one Stored Procedure"*. Create a true procedure (`CREATE OR REPLACE PROCEDURE pr_sahib_24bci0292_...`) callable via `CALL`, distinct from existing stored functions (`CREATE FUNCTION`).
3. **Fix `npm test` QA Suite Execution (Rubric Item 6 - 5 Marks):**
   - Resolve the Node v24 `scryptSync` / PGlite memory allocation crash in `scripts/qa-verify.js` so all 72 test assertions run, pass, and report clean exit code 0.
4. **Git Branching & Meaningful Commit History (Rubric Item 6 - 5 Marks):**
   - The rubric requires *"Minimum 10 meaningful commits"* and *"Minimum 2 branches (main, dev)"*. The repository currently has only 2 commits and 1 branch (`main`). Create the `dev` branch and commit subsequent real task improvements progressively.

### Priority 2: Medium Exam Impact (Feature Alignment)
5. **Database Backup & Recovery Utility Scripts (Rubric Item 6):**
   - Create real, tested scripts in `scripts/` (e.g. `scripts/backup.sh` / `scripts/backup.js` or PowerShell equivalents) executing `pg_dump` and `pg_restore`.
6. **Zod API Route Validation (Rubric Item 4 - 4 Marks):**
   - Introduce actual Zod schemas for POST/PUT API request payloads (`/api/reviews`, `/api/auth/login`, `/api/lists`) so claims of Zod validation are genuine.
7. **Pagination in APIs and UI (Rubric Item 4 - 4 Marks):**
   - Add `page` and `limit` support to `/api/movies` using SQL `LIMIT $1 OFFSET $2`, and wire up pagination controls in the discovery interface.
8. **Prisma ORM Artifacts (Rubric Item 3 - 7 Marks):**
   - Either add a valid `prisma/schema.prisma` file with a lightweight query client demonstration or clearly document why raw SQL was chosen for DBMS observability without falsely claiming full ORM usage.

### Priority 3: Low Exam Impact (Bonus Marks & DevOps)
9. **CI/CD Pipeline (Bonus +1 Mark):**
   - Add `.github/workflows/ci.yml` running linting, type-checking, and `npm test` on push.
10. **Dockerization (Rubric Item 6):**
    - Add a working `Dockerfile` and `docker-compose.yml` for multi-container evaluation (Next.js app + PostgreSQL 16 container).
11. **Gemini Model Alignment:**
    - Update the default fallback Gemini model in `agent.ts` and `mood/route.ts` from the synthetic `'gemini-3.8-flash'` to valid model identifiers (`'gemini-1.5-flash'` or `'gemini-2.0-flash'`).
