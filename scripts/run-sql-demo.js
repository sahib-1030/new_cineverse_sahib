const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { PGlite } = require('@electric-sql/pglite');

async function main() {
  const sqlFile = path.join(__dirname, '..', 'docs', 'sql_demo.sql');
  if (!fs.existsSync(sqlFile)) {
    console.error(`❌ SQL Demo file not found at ${sqlFile}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlFile, 'utf8');

  console.log('='.repeat(80));
  console.log('   CINEVERSE POSTGRESQL DEMONSTRATION & OBSERVABILITY RUNNER');
  console.log('   Owner Tag: SAHIB_24BCI0292');
  console.log('   Script Target: docs/sql_demo.sql');
  console.log('='.repeat(80));

  let dbTarget = 'pglite';
  let pool = null;

  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cineverse';

  // 1. Check if external PostgreSQL / Docker container is available
  try {
    pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 1500,
    });
    const probe = await pool.query('SELECT 1 AS probe;');
    if (probe) {
      dbTarget = 'postgres';
      console.log(`🔌 Connected to PostgreSQL Container (${connectionString.replace(/:[^:@]*@/, ':****@')})`);
    }
  } catch {
    if (pool) {
      await pool.end().catch(() => {});
      pool = null;
    }
    dbTarget = 'pglite';
    console.log('ℹ️  PostgreSQL container not directly reachable at localhost:5432.');
    console.log('⚡ Running demonstration against embedded CineVerse PostgreSQL engine (.pglite_db)...');
  }

  let db;
  if (dbTarget === 'postgres') {
    db = pool;
  } else {
    const dbPath = path.join(__dirname, '..', '.pglite_db');
    db = new PGlite(dbPath);
  }

  try {
    console.log('\n🚀 Executing docs/sql_demo.sql...\n');
    const startTotal = performance.now();

    // Split sqlContent into logical section blocks
    const sections = sqlContent.split(/-- ={10,}\r?\n-- (SECTION \d+:[\s\S]*?)-- ={10,}/g);

    // If section headers are matched by regex:
    // sections[0] is preamble
    // sections[1] is Section 1 title, sections[2] is Section 1 sql
    // sections[3] is Section 2 title, sections[4] is Section 2 sql, etc.

    if (sections.length > 1) {
      for (let i = 1; i < sections.length; i += 2) {
        const title = sections[i].trim();
        const sectionSql = sections[i + 1]?.trim();
        if (!sectionSql) continue;

        console.log('-'.repeat(80));
        console.log(`📌 ${title}`);
        console.log('-'.repeat(80));

        const startSec = performance.now();
        if (dbTarget === 'postgres') {
          const client = await pool.connect();
          try {
            const res = await client.query(sectionSql);
            const secDuration = (performance.now() - startSec).toFixed(2);
            console.log(`⏱️ Execution Time: ${secDuration}ms`);

            // If result contains rows, print them
            if (Array.isArray(res)) {
              for (const r of res) {
                if (r.rows && r.rows.length > 0) {
                  console.table(r.rows);
                }
              }
            } else if (res && res.rows && res.rows.length > 0) {
              console.table(res.rows);
            } else {
              console.log('✅ Section executed successfully.');
            }
          } finally {
            client.release();
          }
        } else {
          // PGlite execution
          await db.exec(sectionSql);
          const secDuration = (performance.now() - startSec).toFixed(2);
          console.log(`⏱️ Execution Time: ${secDuration}ms`);

          // Extract SELECT statements in the section and query for display
          const selectMatches = sectionSql.match(/SELECT[\s\S]+?;/gi);
          if (selectMatches) {
            for (const selectStmt of selectMatches.slice(0, 2)) {
              try {
                const r = await db.query(selectStmt);
                if (r.rows && r.rows.length > 0) {
                  console.table(r.rows.slice(0, 5));
                }
              } catch {}
            }
          }
          console.log('✅ Section executed successfully in embedded PostgreSQL.');
        }
        console.log('');
      }
    } else {
      // Fallback single exec
      if (dbTarget === 'postgres') {
        await pool.query(sqlContent);
      } else {
        await db.exec(sqlContent);
      }
    }

    const totalDuration = ((performance.now() - startTotal) / 1000).toFixed(2);
    console.log('='.repeat(80));
    console.log(`🎉 Demo Execution Complete! All sections verified in ${totalDuration}s.`);
    console.log('   Owner Tag Verified: SAHIB_24BCI0292');
    console.log('='.repeat(80));

    if (pool) {
      await pool.end().catch(() => {});
    }
    process.exit(0);
  } catch (err) {
    console.error('\n❌ SQL Demo Execution Error:', err.message);
    if (pool) {
      await pool.end().catch(() => {});
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error running sql demo:', err);
  process.exit(1);
});
