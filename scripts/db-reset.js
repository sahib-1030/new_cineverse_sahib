const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cineverse';
  const maskedUrl = connectionString.replace(/:[^:@]*@/, ':****@');
  console.log(`🔄 Resetting CineVerse database on PostgreSQL (${maskedUrl})...`);

  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 10000,
  });

  try {
    // Check connection
    await pool.query('SELECT 1 AS probe;');
  } catch (connErr) {
    console.error(`❌ Unable to connect to PostgreSQL at ${maskedUrl}:`, connErr.message);
    console.error('💡 Ensure the PostgreSQL server/container is running (e.g. docker compose up -d db) and credentials match .env');
    await pool.end().catch(() => {});
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const seedPath = path.join(__dirname, '..', 'db', 'seed.sql');

  if (!fs.existsSync(schemaPath) || !fs.existsSync(seedPath)) {
    console.error('❌ Missing db/schema.sql or db/seed.sql');
    await pool.end();
    process.exit(1);
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const seedSql = fs.readFileSync(seedPath, 'utf8');

  console.log('📦 Executing db/schema.sql (tables, views, functions, triggers, procedures)...');
  await pool.query(schemaSql);

  console.log('🌱 Executing db/seed.sql (genres, users, movies, reviews, cast, watchlists)...');
  await pool.query(seedSql);

  console.log('🎬 Seeding Countercut investigation demo fixtures...');
  const { seedCountercutFixtures } = require('./seed-countercut-fixture');
  await seedCountercutFixtures(pool);

  const moviesCount = await pool.query('SELECT COUNT(*)::int as c FROM movies;');
  const usersCount = await pool.query('SELECT COUNT(*)::int as c FROM users;');
  const reviewsCount = await pool.query('SELECT COUNT(*)::int as c FROM reviews;');

  console.log(`✅ PostgreSQL Reset Complete! Seed summary:`);
  console.log(`   - Movies: ${moviesCount.rows[0].c}`);
  console.log(`   - Users: ${usersCount.rows[0].c}`);
  console.log(`   - Reviews: ${reviewsCount.rows[0].c}`);

  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Failed to reset PostgreSQL database:', err);
  process.exit(1);
});
