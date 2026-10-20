const { PGlite } = require('@electric-sql/pglite');
const path = require('path');

const dbPath = path.join(process.cwd(), '.pglite_db');

async function run() {
  const query = process.argv[2];
  
  if (!query) {
    console.log("\n❌ Please provide an SQL query.\n");
    console.log("Usage Example:");
    console.log("  node scripts/sql.js \"SELECT * FROM users LIMIT 3;\"\n");
    process.exit(1);
  }

  const db = new PGlite(dbPath);
  
  try {
    const start = performance.now();
    const res = await db.query(query);
    const duration = (performance.now() - start).toFixed(2);
    
    console.log(`\n✅ Query executed in ${duration}ms\n`);
    
    if (res.rows && res.rows.length > 0) {
      console.table(res.rows);
      console.log(`\nTotal rows: ${res.rows.length}\n`);
    } else {
      console.log("Query executed successfully. (0 rows returned)\n");
    }
  } catch (err) {
    console.error("\n❌ SQL Error:", err.message, "\n");
  }
}

run();
