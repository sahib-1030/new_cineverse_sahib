export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { FilmDnaData, FilmDnaAxis, FilmDnaArchetype } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = parseInt(params.id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  const startTime = performance.now();

  try {
    // 1. Verify User Exists
    const userRes = await query<{
      user_id: number;
      username: string;
      display_name: string;
    }>(
      `SELECT user_id, username, display_name FROM users WHERE user_id = $1;`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userRes.rows[0];

    // 2. Query Genre Diversity
    const genreRes = await query<{
      distinct_genres: number;
      total_genres: number;
    }>(
      `SELECT 
        COUNT(DISTINCT mg.genre_id)::int AS distinct_genres,
        (SELECT COUNT(*)::int FROM genres) AS total_genres
      FROM reviews r
      JOIN movie_genres mg ON mg.movie_id = r.movie_id
      WHERE r.user_id = $1;`,
      [userId]
    );

    // 3. Query Rating Severity & Volume
    const ratingRes = await query<{
      total_reviews: number;
      avg_rating: string;
      high_ratings_count: number;
      harsh_ratings_count: number;
    }>(
      `SELECT 
        COUNT(*)::int AS total_reviews,
        COALESCE(ROUND(AVG(r.rating), 2), 0.0) AS avg_rating,
        COUNT(*) FILTER (WHERE r.rating >= 9.0)::int AS high_ratings_count,
        COUNT(*) FILTER (WHERE r.rating <= 6.5)::int AS harsh_ratings_count
      FROM reviews r
      WHERE r.user_id = $1;`,
      [userId]
    );

    // 4. Query Epic Preference (Runtime analysis)
    const runtimeRes = await query<{
      epic_count: number;
      avg_runtime: number;
      max_runtime: number;
    }>(
      `SELECT 
        COUNT(*) FILTER (WHERE m.runtime >= 135)::int AS epic_count,
        COALESCE(ROUND(AVG(m.runtime), 0)::int, 0) AS avg_runtime,
        COALESCE(MAX(m.runtime)::int, 0) AS max_runtime
      FROM reviews r
      JOIN movies m ON m.movie_id = r.movie_id
      WHERE r.user_id = $1;`,
      [userId]
    );

    // 5. Query Decade Spread (Release Year Dispersion)
    const decadeRes = await query<{
      decade_stddev: string;
      min_year: number;
      max_year: number;
    }>(
      `SELECT 
        COALESCE(ROUND(STDDEV(EXTRACT(YEAR FROM m.release_date))::numeric, 1), 0.0) AS decade_stddev,
        COALESCE(MIN(EXTRACT(YEAR FROM m.release_date))::int, 2000) AS min_year,
        COALESCE(MAX(EXTRACT(YEAR FROM m.release_date))::int, 2024) AS max_year
      FROM reviews r
      JOIN movies m ON m.movie_id = r.movie_id
      WHERE r.user_id = $1;`,
      [userId]
    );

    // 6. Query Social Engagement Metrics
    const socialRes = await query<{
      followers_count: number;
      following_count: number;
      likes_received: number;
    }>(
      `SELECT 
        (SELECT COUNT(*)::int FROM follows WHERE following_id = $1) AS followers_count,
        (SELECT COUNT(*)::int FROM follows WHERE follower_id = $1) AS following_count,
        (SELECT COUNT(*)::int FROM review_likes rl JOIN reviews r ON rl.review_id = r.review_id WHERE r.user_id = $1) AS likes_received;`,
      [userId]
    );

    const distinctGenres = genreRes.rows[0]?.distinct_genres || 0;
    const totalGenres = Math.max(1, genreRes.rows[0]?.total_genres || 8);
    const totalReviews = ratingRes.rows[0]?.total_reviews || 0;
    const avgRating = parseFloat(ratingRes.rows[0]?.avg_rating || '0.0');
    const epicCount = runtimeRes.rows[0]?.epic_count || 0;
    const avgRuntime = runtimeRes.rows[0]?.avg_runtime || 0;
    const decadeStdDev = parseFloat(decadeRes.rows[0]?.decade_stddev || '0.0');
    const minYear = decadeRes.rows[0]?.min_year || 2000;
    const maxYear = decadeRes.rows[0]?.max_year || 2024;
    const followers = socialRes.rows[0]?.followers_count || 0;
    const following = socialRes.rows[0]?.following_count || 0;
    const likesReceived = socialRes.rows[0]?.likes_received || 0;

    // --- Normalized 0-100 Mathematical Scores ---
    // 1. Genre Diversity: Distinct genres / total genres in DB
    const genreDiversityScore = Math.min(100, Math.round((distinctGenres / totalGenres) * 100));

    // 2. Critic Severity: Inverted average rating with curve (lower average = higher severity/selectivity)
    // 10.0 avg = 20 score, 7.0 avg = 80 score, 5.0 avg = 100 score
    const criticSeverityScore = Math.min(
      100,
      Math.max(10, Math.round(((10.0 - (avgRating > 0 ? avgRating : 8.0)) / 4.0) * 80 + 20))
    );

    // 3. Watch Volume: Scaled to 25 reviews for max score
    const watchVolumeScore = Math.min(100, Math.max(15, Math.round((totalReviews / 15) * 100)));

    // 4. Epic Preference: % of films >= 135 mins
    const epicPct = totalReviews > 0 ? Math.round((epicCount / totalReviews) * 100) : 0;
    const epicPreferenceScore = Math.min(100, Math.max(10, epicPct));

    // 5. Decade Spread: Standard deviation of release years (15+ years stddev = 100)
    const decadeSpreadScore = Math.min(100, Math.max(15, Math.round((decadeStdDev / 15.0) * 100)));

    // 6. Social Engagement: Followers + Following + Likes received
    const totalSocial = followers * 3 + following + likesReceived * 2;
    const socialEngagementScore = Math.min(100, Math.max(15, Math.round((totalSocial / 15) * 100)));

    // --- Archetype Classification ---
    const scores = [
      { key: 'genreDiversity', score: genreDiversityScore },
      { key: 'criticSeverity', score: criticSeverityScore },
      { key: 'epicPreference', score: epicPreferenceScore },
      { key: 'decadeSpread', score: decadeSpreadScore },
      { key: 'watchVolume', score: watchVolumeScore },
      { key: 'socialEngagement', score: socialEngagementScore },
    ];

    scores.sort((a, b) => b.score - a.score);
    const dominantTrait = scores[0].key;

    let archetype: FilmDnaArchetype;
    switch (dominantTrait) {
      case 'genreDiversity':
        archetype = {
          title: 'The Eclectic Omnivore',
          motto: 'Aesthetic Boundaries Are Made to Be Broken',
          description:
            'You navigate disparate genres with equal curiosity, connecting animation, sci-fi, and arthouse noir seamlessly.',
          badgeColor: '#a855f7',
        };
        break;
      case 'criticSeverity':
        archetype = {
          title: 'The Discerning Auteurist',
          motto: 'Perfection Is Non-Negotiable',
          description:
            'A high threshold for excellence. You rarely bestow 10s, reserving praise strictly for transcendent cinematic triumphs.',
          badgeColor: '#ff6b57',
        };
        break;
      case 'epicPreference':
        archetype = {
          title: 'The Epic Marathoner',
          motto: 'True Cinema Demands Scope and Scale',
          description:
            'Drawn to massive runtimes, grand world-building, and immersive storytelling that envelops the viewer for hours.',
          badgeColor: '#06b6d4',
        };
        break;
      case 'decadeSpread':
        archetype = {
          title: 'The Temporal Archivist',
          motto: 'Cinema Was Born in the Shadows of History',
          description:
            'A historian at heart with high temporal variance, appreciating both mid-century classics and contemporary wonders.',
          badgeColor: '#f59e0b',
        };
        break;
      case 'socialEngagement':
        archetype = {
          title: 'The Cultural Beacon',
          motto: 'Films Exist to Spark Discourse',
          description:
            'A community catalyst whose watchlists and reviews ignite discussion and influence peer taste.',
          badgeColor: '#10b981',
        };
        break;
      default:
        archetype = {
          title: 'The Dedicated Cinephile',
          motto: 'Living in the Flicker of the Screen',
          description:
            'A voracious appetite for motion pictures with consistent logging, thoughtful scores, and unwavering dedication.',
          badgeColor: '#ec4899',
        };
        break;
    }

    const axes: FilmDnaAxis[] = [
      {
        key: 'genreDiversity',
        label: 'Genre Diversity',
        value: genreDiversityScore,
        rawValue: `${distinctGenres} / ${totalGenres} genres`,
        description: 'Breadth of distinct genres explored in reviewed titles.',
      },
      {
        key: 'criticSeverity',
        label: 'Critic Severity',
        value: criticSeverityScore,
        rawValue: `★ ${avgRating.toFixed(1)} mean score`,
        description: 'Critical selectivity and threshold for high ratings.',
      },
      {
        key: 'watchVolume',
        label: 'Watch Volume',
        value: watchVolumeScore,
        rawValue: `${totalReviews} films logged`,
        description: 'Total volume of titles comprehensively reviewed.',
      },
      {
        key: 'socialEngagement',
        label: 'Social Resonance',
        value: socialEngagementScore,
        rawValue: `${followers} followers · ${likesReceived} likes`,
        description: 'Community network density, followers, and engagement.',
      },
      {
        key: 'epicPreference',
        label: 'Epic Preference',
        value: epicPreferenceScore,
        rawValue: `${epicPct}% films > 135 min`,
        description: 'Affinity for extended runtimes and grand scale storytelling.',
      },
      {
        key: 'decadeSpread',
        label: 'Decade Spread',
        value: decadeSpreadScore,
        rawValue: `σ = ${decadeStdDev} yrs (${minYear}–${maxYear})`,
        description: 'Dispersion of release eras across reviewed films.',
      },
    ];

    const totalDurationMs = Math.round((performance.now() - startTime) * 100) / 100;

    const combinedSql = `-- [FilmDNA Analysis Queries]
1. SELECT COUNT(DISTINCT mg.genre_id) FROM reviews JOIN movie_genres ...
2. SELECT AVG(rating), COUNT(*) FILTER (WHERE runtime >= 135) ...
3. SELECT STDDEV(EXTRACT(YEAR FROM release_date)) FROM reviews JOIN movies ...`;

    const responseData: FilmDnaData = {
      userId,
      username: user.username,
      displayName: user.display_name,
      archetype,
      axes,
      metrics: {
        genreDiversityScore,
        criticSeverityScore,
        watchVolumeScore,
        socialEngagementScore,
        epicPreferenceScore,
        decadeSpreadScore,
        distinctGenresCount: distinctGenres,
        totalAvailableGenres: totalGenres,
        avgRating,
        totalReviews,
        epicFilmsCount: epicCount,
        epicFilmsPct: epicPct,
        avgRuntimeMinutes: avgRuntime,
        decadeSpreadYears: decadeStdDev,
        minReleaseYear: minYear,
        maxReleaseYear: maxYear,
        socialScore: totalSocial,
      },
      meta: {
        sql: combinedSql,
        durationMs: totalDurationMs,
        rowCount: 6,
      },
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('FilmDNA API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
