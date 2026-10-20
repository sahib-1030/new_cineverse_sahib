const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = '15d2ea6d0dc1d476efbca3eba2b9bbfb';

function fetchTMDB(title) {
  return new Promise((resolve) => {
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(title)}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.results && parsed.results.length > 0) {
            resolve(parsed.results[0]);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function run() {
  const seedPath = path.join(process.cwd(), 'db', 'seed.sql');
  let sql = fs.readFileSync(seedPath, 'utf8');

  const lines = sql.split('\n');
  let inMoviesInsert = false;
  let updatedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('INSERT INTO movies')) {
      inMoviesInsert = true;
      continue;
    }
    if (inMoviesInsert && line.startsWith('ON CONFLICT')) {
      inMoviesInsert = false;
      continue;
    }

    if (inMoviesInsert && line.trim().startsWith('(')) {
      const titleMatch = line.match(/^\(\d+,\s*'((?:[^']|'')*)'/);
      if (titleMatch) {
        let title = titleMatch[1].replace(/''/g, "'");
        
        console.log(`Fetching real TMDB data for: ${title}`);
        const tmdbData = await fetchTMDB(title);
        
        if (tmdbData && tmdbData.poster_path && tmdbData.backdrop_path) {
          const poster = `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`;
          const backdrop = `https://image.tmdb.org/t/p/original${tmdbData.backdrop_path}`;
          
          let matchCount = 0;
          const newLine = line.replace(/'https:\/\/[^']+'/g, (match) => {
            if (match.includes('youtube') || match.includes('dQw4w') || match.includes('8g18jFHCLXk')) {
              return match; // Don't touch the trailer
            }
            matchCount++;
            if (matchCount === 1) return `'${poster}'`;
            if (matchCount === 2) return `'${backdrop}'`;
            return match; // Any others (shouldn't be any)
          });
          
          lines[i] = newLine;
          console.log(`✅ Updated: ${title}`);
          updatedCount++;
        } else {
          console.log(`⚠️ Not found or missing images for: ${title}`);
        }
        
        await new Promise(r => setTimeout(r, 80));
      }
    }
  }

  fs.writeFileSync(seedPath, lines.join('\n'));
  console.log(`\nDone! Replaced ${updatedCount} movie URLs in seed.sql with REAL TMDB images.`);
}

run();
