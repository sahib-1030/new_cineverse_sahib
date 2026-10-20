const { PGlite } = require('@electric-sql/pglite');
const fs = require('fs');
const path = require('path');

async function main() {
  if (process.env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL is set. Refusing to perform destructive auto-reset on external database.');
    process.exit(1);
  }

  const dbPath = path.join(__dirname, '..', '.pglite_db');
  console.log('🔄 Resetting local CineVerse database (.pglite_db)...');

  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath, { recursive: true, force: true });
  }

  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const seedPath = path.join(__dirname, '..', 'db', 'seed.sql');

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const seedSql = fs.readFileSync(seedPath, 'utf8');

  const db = new PGlite(dbPath);
  console.log('📦 Executing schema.sql...');
  await db.exec(schemaSql);
  console.log('🌱 Executing seed.sql...');
  await db.exec(seedSql);

  const { seedCountercutFixtures } = require('./seed-countercut-fixture');
  await seedCountercutFixtures();

  const moviesCount = await db.query('SELECT COUNT(*)::int as c FROM movies;');
  const usersCount = await db.query('SELECT COUNT(*)::int as c FROM users;');
  const reviewsCount = await db.query('SELECT COUNT(*)::int as c FROM reviews;');

  console.log(`✅ Reset complete! Seeded:`);
  console.log(`   - Movies: ${moviesCount.rows[0].c}`);
  console.log(`   - Users: ${usersCount.rows[0].c}`);
  console.log(`   - Reviews: ${reviewsCount.rows[0].c}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Failed to reset database:', err);
  process.exit(1);
});
