# CineVerse Deployment & Infrastructure Guide

This guide details the complete production architecture, managed cloud PostgreSQL setup, Vercel continuous deployment integration, database migration/seeding procedures, and custom domain configuration.

---

## 1. CI/CD Architecture Overview

CineVerse follows an automated two-tier CI/CD workflow:

```mermaid
flowchart TD
    subgraph GitHub["GitHub Repository"]
        PR[Pull Request / Push to dev]
        MAIN[Push to main]
    end

    subgraph CI["GitHub Actions (.github/workflows/ci.yml)"]
        TEST["Job: test<br/>PostgreSQL 16 container<br/>npm ci · prisma generate · db:reset · lint · tsc · test"]
        BUILD["Job: build<br/>npm run build"]
        DOCKER["Job: docker<br/>docker/build-push-action<br/>(Push to Docker Hub on main only)"]
    end

    subgraph CD["Vercel Native GitHub Integration"]
        VERCEL_PREVIEW["Vercel Preview Deployment<br/>(Triggered on PRs)"]
        VERCEL_PROD["Vercel Production Deployment<br/>(Triggered on merge to main)"]
    end

    subgraph Database["Neon Serverless PostgreSQL"]
        NEON_DIRECT[Direct Endpoint: port 5432<br/>For migrations & seed]
        NEON_POOLED[Pooled Endpoint: port 5432<br/>For Vercel serverless functions]
    end

    PR --> TEST
    PR --> BUILD
    TEST --> DOCKER
    BUILD --> DOCKER
    PR --> VERCEL_PREVIEW

    MAIN --> TEST
    MAIN --> BUILD
    MAIN --> DOCKER
    MAIN --> VERCEL_PROD

    NEON_DIRECT -.->|One-time seed| Database
    VERCEL_PROD -->|Runtime queries| NEON_POOLED
```

> [!IMPORTANT]
> **No Fake Deploy Steps**: In accordance with Vercel best practices, production deployments are handled directly by **Vercel's native GitHub Integration**. When commits are merged into `main`, Vercel immediately triggers an immutable production build via webhooks. The GitHub Actions workflow is strictly dedicated to automated testing, quality gates (linting, typechecking, QA suite), and Docker Hub image builds.

---

## 2. Managed PostgreSQL Cloud Database Setup (Neon)

CineVerse is architected for PostgreSQL 16. For cloud production, **[Neon Serverless PostgreSQL](https://neon.tech)** is the recommended managed database provider.

### Why Neon?
* Serverless scaling with instant database branching.
* Built-in connection pooling via PgBouncer for high-concurrency serverless API routes.
* Full PostgreSQL 16 feature parity, supporting stored procedures (`sp_sahib_24bci0292_add_review`), complex views, and ACID transaction triggers.

### Understanding Direct vs. Pooled Connection Strings
Neon provides two distinct connection strings in your dashboard project settings:

1. **Direct Connection String (Non-Pooled)**:
   * Format: `postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/cineverse?sslmode=require`
   * **Use Case**: **Database migrations, initial schema creation, and seeding (`npm run db:reset`)**.
   * *Rationale*: Connection poolers (such as PgBouncer in transaction mode) disallow DDL statements (`CREATE TABLE`, `DROP VIEW`), prepared statements, and session-level stored procedures. Always use the direct connection string when executing schema installation and seed scripts.
2. **Pooled Connection String**:
   * Format: `postgresql://user:password@ep-xyz-pooler.us-east-2.aws.neon.tech/cineverse?sslmode=require`
   * **Use Case**: **Vercel runtime environment (`DATABASE_URL` in Vercel settings)**.
   * *Rationale*: Serverless Next.js functions open and close connections rapidly. The pooled endpoint manages connection reuse efficiently to prevent exhausting database connection limits.

---

## 3. How to Seed the Cloud Database (One-Time Setup)

Once your Neon PostgreSQL project is provisioned, apply the complete 3NF schema, stored procedures, triggers, views, and initial seed dataset:

### Step 1: Obtain your Direct Connection String
From your Neon Console, select your database (e.g., `cineverse`) and copy the **Direct connection** URI.

### Step 2: Run `db:reset` from your Local Machine
Execute the project's standardized reset command pointing directly to the cloud instance:

```bash
DATABASE_URL="postgresql://[USER]:[PASSWORD]@[ENDPOINT].us-east-2.aws.neon.tech/cineverse?sslmode=require" npm run db:reset
```

### What Happens:
1. Connects via `pg.Pool` with SSL encryption enabled.
2. Applies `db/schema.sql` (drops old objects, creates all 17 tables, 6 analytical views, 4 triggers, and stored procedure `sp_sahib_24bci0292_add_review`).
3. Applies `db/seed.sql` (inserts genres, movies, cast, users, and reviews).
4. Runs `scripts/seed-countercut-fixture.js` (ensures idempotent investigation demo cases for Alex Rivera and Elena Rostov).
5. Outputs confirmation metrics:
   ```text
   ✅ PostgreSQL Reset Complete! Seed summary:
      - Movies: 32
      - Users: 6
      - Reviews: 14
   ```

---

## 4. Vercel Configuration & Environment Variables

### Step 1: Connect GitHub Repository to Vercel
1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Select the `new_cineverse_sahib` repository.
4. Framework Preset: **Next.js** (detected automatically).
5. Root Directory: `./`.

### Step 2: Configure Production Environment Variables
Add the following environment variables in **Project Settings -> Environment Variables**:

| Variable Name | Environment | Value / Description | Required? |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Production, Preview | Neon Pooled Connection String: `postgresql://user:pass@ep-xyz-pooler.us-east-2.aws.neon.tech/cineverse?sslmode=require` | **Yes** |
| `SESSION_SECRET` | Production, Preview | A 64-character random string for HMAC scrypt session tokens (e.g., generated with `openssl rand -hex 32`) | **Yes** |
| `GEMINI_API_KEY` | Production, Preview | Google AI Studio Gemini API key (server-side only) | Optional |
| `GEMINI_MODEL` | Production, Preview | `gemini-3.8-flash` | Optional |
| `ENABLE_DBMS_SQL_CONSOLE` | Production | `false` (keep disabled on public production) | Optional |
| `ENABLE_DBMS_DEMO_MUTATIONS` | Production | `false` (prevents destructive demo mutations in production) | Optional |
| `ALLOW_DEMO_LOGIN` | Production | `false` (disables shared seeded accounts on public servers) | Optional |

Click **Deploy**.

---

## 5. Adding a Custom Domain

To point a custom domain (e.g., `cineverse.io` or `movies.yourdomain.com`) to your Vercel deployment:

1. Open your project in the **Vercel Dashboard**.
2. Navigate to **Settings** -> **Domains**.
3. Enter your custom domain name and click **Add**.
4. Configure DNS records at your DNS registrar:
   * **Apex Domain (`yourdomain.com`)**:
     * Type: `A`
     * Name: `@`
     * Value: `76.76.21.21`
   * **Subdomain (`www.yourdomain.com` or `cineverse.yourdomain.com`)**:
     * Type: `CNAME`
     * Name: `www` (or your subdomain prefix)
     * Value: `cname.vercel-dns.com.`
5. Vercel will automatically verify DNS propagation and issue a free SSL/TLS certificate via Let's Encrypt within a few minutes.

---

## 6. Live Application URL & Health Verification

### Where the Live URL Goes
Once deployed, document and surface the live application URL in the following primary locations:
1. **GitHub Repository Header**: Set the **Website** field in the repository's "About" section on GitHub.
2. **README Header**: Added to the top badges section in `README.md`:
   ```markdown
   [![Live App](https://img.shields.io/badge/Live%20App-Vercel-black?style=flat&logo=vercel)](https://cineverse.yourdomain.com)
   ```
3. **Course / Project Submission Portal**: Listed as the production entrypoint.

### Post-Deployment Verification Checklist
After deployment completes, verify the following core endpoints on your live domain:

* [ ] **Home Page (`/`)**: Confirms movie shelves, hero trailer modal, and mood selectors load.
* [ ] **Movie Details (`/movies/1`)**: Confirms relational join of movie metadata, cast members, and user reviews.
* [ ] **Feed (`/feed`)**: Verifies real-time activity feed view (`v_recent_activity_feed`).
* [ ] **DBMS Laboratory (`/trace`)**: Verifies CineTrace provenance visualization.
* [ ] **Database Engine Health (`/api/dbms/schema`)**: Confirms connection to `POSTGRESQL 16 ENGINE`.
