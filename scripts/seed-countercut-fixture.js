const { PGlite } = require('@electric-sql/pglite');
const path = require('path');

const dbPath = path.join(__dirname, '..', '.pglite_db');
const db = new PGlite(dbPath);

async function seedCountercutFixtures() {
  console.log('🎬 Seeding idempotent Countercut investigation demo fixtures...');

  // 1. Ensure Alex Rivera (user_id = 1) has contrasting ratings in Sci-Fi:
  // Interstellar (id: 2) -> 10.0, Arrival (id: 18) -> 4.5
  // The Dark Knight (id: 3) -> 9.8, Dune: Part Two (id: 4) -> 9.7, Blade Runner 2049 (id: 13) -> 9.6
  await db.query(`
    INSERT INTO reviews (user_id, movie_id, rating, review_text, has_spoilers, updated_at)
    VALUES (1, 2, 10.0, 'Transcendent. The docking scene alone is one of the most suspenseful sequences ever put to 70mm film.', FALSE, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, movie_id) DO UPDATE SET rating = 10.0;
  `);

  const alexReviews = [
    {
      movieId: 18,
      rating: 4.5,
      reviewText: "Interesting premise regarding nonlinear linguistics, but it felt emotionally detached and slow compared to Villeneuve's other work. The pacing struggled to maintain tension.",
    },
    {
      movieId: 3,
      rating: 9.8,
      reviewText: "The definitive superhero film and an all-time classic thriller. Ledger's Joker is unmatched.",
    },
    {
      movieId: 4,
      rating: 9.7,
      reviewText: "Visually stunning operatic cinema. Hans Zimmer's pounding score and Austin Butler's menacing Feyd-Rautha make it epic.",
    },
    {
      movieId: 13,
      rating: 9.6,
      reviewText: "Breathtaking visual design and Deakins cinematography. Expands on the original with emotional weight.",
    },
  ];

  for (const r of alexReviews) {
    await db.query(`
      INSERT INTO reviews (user_id, movie_id, rating, review_text, has_spoilers, updated_at)
      VALUES (1, $1, $2, $3, FALSE, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, movie_id) DO NOTHING;
    `, [r.movieId, r.rating, r.reviewText]);
  }

  // 2. Ensure Elena Rostov (user_id = 4) acts as "The Opposite Critic"
  // High overlap on 5 shared films (Inception, Interstellar, The Matrix, The Dark Knight, Dune: Part Two)
  // Strong disagreement on Oppenheimer (Movie 5): Elena rates 4.0 vs Alex's 9.6
  const elenaReviews = [
    {
      movieId: 1, // Inception (Alex: 9.8)
      rating: 9.5,
      reviewText: "Remarkable high-concept narrative construction. Nolan balances multi-tier dream logistics with kinetic momentum.",
    },
    {
      movieId: 2, // Interstellar (Alex: 10.0)
      rating: 9.6,
      reviewText: "Astonishing scale and gravitational grandeur. The organ score drives the emotional urgency beautifully.",
    },
    {
      movieId: 9, // The Matrix (Alex: 9.8)
      rating: 9.4,
      reviewText: "Seminal sci-fi that revolutionized modern cinema. Philosophy wrapped in visceral leather and kinetic martial arts.",
    },
    {
      movieId: 3, // The Dark Knight (Alex: 9.8)
      rating: 9.5,
      reviewText: "A gritty, gripping crime drama masquerading as a comic book movie. Masterful tension and pacing.",
    },
    {
      movieId: 4, // Dune: Part Two (Alex: 9.7)
      rating: 9.5,
      reviewText: "A towering triumph of blockbuster filmmaking. The spice harvester raid is sheer cinematic scale.",
    },
    {
      movieId: 5, // Oppenheimer (Alex: 9.6 -> Elena: 4.0 => 5.6 point disagreement)
      rating: 4.0,
      reviewText: "Technically polished and loud, but emotionally hollow. Three hours of men talking in rooms without human vulnerability. Disappointing.",
    },
  ];

  for (const r of elenaReviews) {
    await db.query(`
      INSERT INTO reviews (user_id, movie_id, rating, review_text, has_spoilers, updated_at)
      VALUES (4, $1, $2, $3, FALSE, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, movie_id) DO NOTHING;
    `, [r.movieId, r.rating, r.reviewText]);
  }

  console.log('✅ Countercut demo fixtures seeded successfully and idempotently.');
  console.log('   - Alex Rivera (User #1) now has personal contrast: Interstellar (10.0) vs Arrival (4.5)');
  console.log('   - Elena Rostov (User #4) is opposite on Oppenheimer (4.0 vs 9.6) with 5 shared films (96.4% historical agreement)');
}

if (require.main === module) {
  seedCountercutFixtures().then(() => process.exit(0)).catch((err) => {
    console.error('Failed to seed fixtures:', err);
    process.exit(1);
  });
}

module.exports = { seedCountercutFixtures };
