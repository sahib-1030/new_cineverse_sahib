const { PGlite } = require('@electric-sql/pglite');
const path = require('path');
const https = require('https');

function fetchMovieData(title) {
  return new Promise((resolve, reject) => {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(title)}&entity=movie&limit=1`;
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
  console.log('Connecting to database...');
  const db = new PGlite(path.join(process.cwd(), '.pglite_db'));
  
  try {
    const res = await db.query('SELECT movie_id, title, poster_url FROM movies');
    const movies = res.rows;
    console.log(`Found ${movies.length} movies. Fixing broken TMDB links...`);
    
    let updatedCount = 0;
    
    // We do this sequentially to avoid rate limits
    for (const m of movies) {
      if (m.poster_url && m.poster_url.includes('image.tmdb.org')) {
        console.log(`Fetching real artwork for: ${m.title}`);
        const data = await fetchMovieData(m.title);
        
        if (data && data.artworkUrl100) {
          // Replace 100x100bb.jpg with 600x900bb.jpg for high-res poster
          const highResPoster = data.artworkUrl100.replace('100x100bb', '600x900bb');
          
          await db.query(
            'UPDATE movies SET poster_url = $1, backdrop_url = $2 WHERE movie_id = $3',
            [highResPoster, highResPoster, m.movie_id]
          );
          console.log(`✅ Updated ${m.title}`);
          updatedCount++;
        } else {
          // Fallback to a sleek placeholder
          const placeholder = `https://placehold.co/600x900/111111/FFFFFF/png?text=${encodeURIComponent(m.title)}&font=montserrat`;
          await db.query(
            'UPDATE movies SET poster_url = $1, backdrop_url = $2 WHERE movie_id = $3',
            [placeholder, placeholder, m.movie_id]
          );
          console.log(`⚠️ Fallback for ${m.title}`);
        }
      }
      
      // Small delay to prevent rate limit
      await new Promise(r => setTimeout(r, 200));
    }
    
    console.log(`\nDone! Successfully updated ${updatedCount} movie posters with real artwork.`);
  } catch(e) {
    console.error('Error:', e);
  }
}

run();
