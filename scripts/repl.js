const { PGlite } = require('@electric-sql/pglite');
const readline = require('readline');
const path = require('path');

const dbPath = path.join(process.cwd(), '.pglite_db');
const db = new PGlite(dbPath);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'postgres=# '
});

console.log("Welcome to CineVerse Interactive SQL REPL!");
console.log("Type your SQL queries and press Enter. Type '.exit' to quit.\n");

rl.prompt();

rl.on('line', async (line) => {
  const query = line.trim();
  if (query.toLowerCase() === '.exit' || query.toLowerCase() === '\\q') {
    process.exit(0);
  }
  
  if (query) {
    try {
      const start = performance.now();
      const res = await db.query(query);
      const duration = (performance.now() - start).toFixed(2);
      
      if (res.rows && res.rows.length > 0) {
        console.table(res.rows);
      }
      console.log(`Time: ${duration}ms | Rows: ${res.rows ? res.rows.length : 0}\n`);
    } catch (err) {
      console.error(`Error: ${err.message}\n`);
    }
  }
  rl.prompt();
}).on('close', () => {
  console.log('\nExiting database.');
  process.exit(0);
});
