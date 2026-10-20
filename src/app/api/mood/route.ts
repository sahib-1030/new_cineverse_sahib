export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { GoogleGenAI } from '@google/genai';
import { MoodDefinition } from '@/lib/types';

const PREDEFINED_MOODS: Record<string, MoodDefinition & { curatorNote: string }> = {
  'make-me-cry': {
    id: 'make-me-cry',
    label: 'Make Me Cry',
    emoji: '😭',
    description: 'Devastating dramas and heartfelt stakes that deliver profound catharsis.',
    curatorNote: 'Targeting high-acclaim Drama & Romance with poignant narrative depth.',
    primaryGenres: ['drama', 'romance'],
    minRating: 8.0,
    accentColor: '#60a5fa',
  },
  'adrenaline-rush': {
    id: 'adrenaline-rush',
    label: 'Adrenaline Rush',
    emoji: '⚡',
    description: 'High-octane momentum, edge-of-seat suspense, and razor-sharp tension.',
    curatorNote: 'Targeting top-rated Action & Thrillers ranked by Bayesian credibility.',
    primaryGenres: ['action', 'thriller'],
    minRating: 7.8,
    accentColor: '#f59e0b',
  },
  'mind-bending': {
    id: 'mind-bending',
    label: 'Mind-Bending',
    emoji: '🌀',
    description: 'Cerebral labyrinths, ontological paradoxes, and nonlinear narratives.',
    curatorNote: 'Targeting speculative Sci-Fi & Psychological Thrillers that challenge perception.',
    primaryGenres: ['sci-fi', 'thriller'],
    minRating: 8.2,
    accentColor: '#a855f7',
  },
  'cozy-escapism': {
    id: 'cozy-escapism',
    label: 'Cozy Escapism',
    emoji: '☕',
    description: 'Comforting, whimsical, and heartwarming worlds to decompress and recharge.',
    curatorNote: 'Targeting charming Comedies & Animation with gentle pacing and uplifting tones.',
    primaryGenres: ['comedy', 'animation'],
    maxRuntime: 125,
    minRating: 7.5,
    accentColor: '#10b981',
  },
  'dark-noir': {
    id: 'dark-noir',
    label: 'Dark & Gritty',
    emoji: '🌧️',
    description: 'Morally ambiguous antiheroes, brooding atmospheres, and urban realism.',
    curatorNote: 'Targeting intense Thrillers and Crime Dramas with heavy noir stylings.',
    primaryGenres: ['thriller', 'drama'],
    minRating: 8.0,
    accentColor: '#94a3b8',
  },
  'existential-wonder': {
    id: 'existential-wonder',
    label: 'Existential Wonder',
    emoji: '🌌',
    description: 'Cosmic scale, breathtaking vistas, and contemplation of humanity.',
    curatorNote: 'Targeting visionary Sci-Fi & philosophical epics with sweeping visual scope.',
    primaryGenres: ['sci-fi', 'drama'],
    minRating: 8.4,
    accentColor: '#06b6d4',
  },
  'spine-chilling': {
    id: 'spine-chilling',
    label: 'Spine-Chilling',
    emoji: '🕯️',
    description: 'Visceral dread, lingering shadows, and psychological suspense.',
    curatorNote: 'Targeting atmospheric Horror and Psychological Thrillers with relentless dread.',
    primaryGenres: ['horror', 'thriller'],
    minRating: 7.2,
    accentColor: '#ef4444',
  },
  'pure-serotonin': {
    id: 'pure-serotonin',
    label: 'Pure Serotonin',
    emoji: '✨',
    description: 'Laugh-out-loud charm, sparkling banter, and effortless joy.',
    curatorNote: 'Targeting uplifting Comedy, Animation, and Romance with feel-good endings.',
    primaryGenres: ['comedy', 'romance', 'animation'],
    minRating: 7.5,
    accentColor: '#ec4899',
  },
};

const AVAILABLE_GENRE_SLUGS = ['drama', 'thriller', 'comedy', 'action', 'sci-fi', 'horror', 'animation', 'romance'];

async function interpretCustomMoodWithGemini(customPrompt: string): Promise<{
  label: string;
  emoji: string;
  genres: string[];
  minRating: number;
  maxRuntime?: number;
  reason: string;
} | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `You are the CineMood curator engine for CineVerse.
Available PostgreSQL database genre slugs: ${JSON.stringify(AVAILABLE_GENRE_SLUGS)}.
User desired feeling or headspace: "${customPrompt}".

Map this prompt to 1 to 3 applicable genre slugs from the available list, determine a reasonable minimum rating (between 6.5 and 8.5), optional maxRuntime in minutes, an evocative emoji, a short 2-3 word label, and a 1-sentence curator reason.

Output ONLY valid JSON matching this schema:
{
  "label": "string",
  "emoji": "single emoji",
  "genres": ["slug1", "slug2"],
  "minRating": 7.5,
  "maxRuntime": 150,
  "reason": "1-sentence poetic explanation"
}`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const raw = response.text?.trim();
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const validGenres = Array.isArray(parsed.genres)
      ? parsed.genres.filter((g: string) => AVAILABLE_GENRE_SLUGS.includes(g))
      : [];

    return {
      label: parsed.label || 'Custom Vibe',
      emoji: parsed.emoji || '✨',
      genres: validGenres.length > 0 ? validGenres : ['drama'],
      minRating: typeof parsed.minRating === 'number' ? parsed.minRating : 7.0,
      maxRuntime: typeof parsed.maxRuntime === 'number' ? parsed.maxRuntime : undefined,
      reason: parsed.reason || `Curated for: "${customPrompt}"`,
    };
  } catch (err) {
    console.warn('Gemini mood interpretation error (falling back to heuristic):', err);
    return null;
  }
}

function heuristicMoodMatch(prompt: string) {
  const p = prompt.toLowerCase();
  if (p.includes('cry') || p.includes('sad') || p.includes('tear') || p.includes('depress') || p.includes('grief')) {
    return PREDEFINED_MOODS['make-me-cry'];
  }
  if (p.includes('action') || p.includes('fight') || p.includes('fast') || p.includes('chase') || p.includes('hype')) {
    return PREDEFINED_MOODS['adrenaline-rush'];
  }
  if (p.includes('mind') || p.includes('twist') || p.includes('brain') || p.includes('puzzle') || p.includes('paradox') || p.includes('smart')) {
    return PREDEFINED_MOODS['mind-bending'];
  }
  if (p.includes('cozy') || p.includes('chill') || p.includes('relax') || p.includes('sleep') || p.includes('sunday')) {
    return PREDEFINED_MOODS['cozy-escapism'];
  }
  if (p.includes('dark') || p.includes('gritty') || p.includes('crime') || p.includes('noir') || p.includes('detective')) {
    return PREDEFINED_MOODS['dark-noir'];
  }
  if (p.includes('space') || p.includes('universe') || p.includes('cosmic') || p.includes('philosophy') || p.includes('deep')) {
    return PREDEFINED_MOODS['existential-wonder'];
  }
  if (p.includes('scary') || p.includes('spooky') || p.includes('horror') || p.includes('ghost') || p.includes('creepy')) {
    return PREDEFINED_MOODS['spine-chilling'];
  }
  if (p.includes('happy') || p.includes('laugh') || p.includes('joy') || p.includes('fun') || p.includes('smile') || p.includes('cheer')) {
    return PREDEFINED_MOODS['pure-serotonin'];
  }
  return PREDEFINED_MOODS['existential-wonder'];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const moodId = searchParams.get('mood');
  const custom = searchParams.get('custom');
  const limit = parseInt(searchParams.get('limit') || '8', 10);

  // If no mood or custom query is requested, return the available mood catalogue
  if (!moodId && !custom) {
    return NextResponse.json({
      availableMoods: Object.values(PREDEFINED_MOODS),
    });
  }

  let label = '';
  let emoji = '🎬';
  let genres: string[] = [];
  let minRating = 7.0;
  let maxRuntime: number | undefined;
  let reason = '';
  let curatorNote = '';
  let resolvedMoodId = moodId || 'custom';

  if (custom) {
    const aiResult = await interpretCustomMoodWithGemini(custom);
    if (aiResult) {
      label = aiResult.label;
      emoji = aiResult.emoji;
      genres = aiResult.genres;
      minRating = aiResult.minRating;
      maxRuntime = aiResult.maxRuntime;
      reason = aiResult.reason;
      curatorNote = `Gemini AI semantic mapping for query: "${custom}"`;
    } else {
      const fallback = heuristicMoodMatch(custom);
      label = fallback.label;
      emoji = fallback.emoji;
      genres = fallback.primaryGenres;
      minRating = fallback.minRating;
      maxRuntime = fallback.maxRuntime;
      reason = `Heuristically aligned with "${fallback.label}" based on your sentiment keywords.`;
      curatorNote = fallback.curatorNote;
      resolvedMoodId = fallback.id;
    }
  } else if (moodId && PREDEFINED_MOODS[moodId]) {
    const preset = PREDEFINED_MOODS[moodId];
    label = preset.label;
    emoji = preset.emoji;
    genres = preset.primaryGenres;
    minRating = preset.minRating;
    maxRuntime = preset.maxRuntime;
    reason = preset.description;
    curatorNote = preset.curatorNote;
  } else {
    return NextResponse.json({ error: `Unknown mood identifier: ${moodId}` }, { status: 400 });
  }

  // Construct SQL Query with parameters
  async function fetchWithThreshold(ratingFloor: number) {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIdx = 1;

    if (genres.length > 0) {
      conditions.push(`EXISTS (
        SELECT 1 FROM movie_genres mg 
        JOIN genres g ON mg.genre_id = g.genre_id 
        WHERE mg.movie_id = m.movie_id AND g.slug = ANY($${paramIdx++})
      )`);
      params.push(genres);
    }

    if (ratingFloor > 0) {
      conditions.push(`m.avg_rating >= $${paramIdx++}`);
      params.push(ratingFloor);
    }

    if (maxRuntime) {
      conditions.push(`m.runtime <= $${paramIdx++}`);
      params.push(maxRuntime);
    }

    const sql = `
      SELECT 
        m.movie_id,
        m.tmdb_id,
        m.title,
        m.tagline,
        m.overview,
        m.release_date,
        m.runtime,
        m.poster_url,
        m.backdrop_url,
        m.trailer_url,
        m.director,
        m.avg_rating,
        m.review_count,
        COALESCE(vtm.bayesian_score, m.avg_rating) as bayesian_score,
        COALESCE(
          json_agg(
            json_build_object('genre_id', g.genre_id, 'name', g.name, 'slug', g.slug)
          ) FILTER (WHERE g.genre_id IS NOT NULL), '[]'
        ) AS genres
      FROM movies m
      LEFT JOIN v_trending_movies vtm ON m.movie_id = vtm.movie_id
      LEFT JOIN movie_genres mg ON m.movie_id = mg.movie_id
      LEFT JOIN genres g ON mg.genre_id = g.genre_id
      WHERE ${conditions.join(' AND ')}
      GROUP BY m.movie_id, vtm.bayesian_score
      ORDER BY vtm.bayesian_score DESC NULLS LAST, m.avg_rating DESC
      LIMIT ${limit};
    `;

    return await query(sql, params);
  }

  try {
    let result = await fetchWithThreshold(minRating);

    // If threshold was too strict and returned fewer than 3 films, relax threshold slightly
    if (result.rows.length < 3 && minRating > 6.0) {
      result = await fetchWithThreshold(Math.max(6.0, minRating - 1.2));
    }

    return NextResponse.json({
      moodId: resolvedMoodId,
      moodLabel: label,
      emoji,
      reason,
      curatorNote,
      matchedGenres: genres,
      movies: result.rows,
      meta: {
        sql: result.sql,
        params: result.params,
        durationMs: result.durationMs,
        rowCount: result.rowCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
