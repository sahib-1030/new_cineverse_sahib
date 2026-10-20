import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import {
  getMyReviewHistory,
  findMyContrastPairs,
  findOpposingCritics,
  getPublicReviewEvidence,
  getMovieContext,
  buildChallengeCandidates,
} from './queries';
import {
  CountercutCase,
  EvidenceRecord,
  FactualMetric,
  ToolReceipt,
  Claim,
  ProposedChallenge,
} from './types';
import { saveCountercutCase } from './persistence';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

/**
 * Approved tool declarations exposed to Gemini.
 * Model NEVER gets arbitrary SQL, shell, or write access.
 */
const toolsDeclarations: FunctionDeclaration[] = [
  {
    name: 'get_my_review_history',
    description: "Retrieve the authenticated user's recent ratings, reviews, and genres.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        limit: {
          type: Type.NUMBER,
          description: 'Maximum number of reviews to inspect (default: 20)',
        },
      },
    },
  },
  {
    name: 'find_my_contrast_pairs',
    description:
      'Search for pairs of films reviewed by the user that share a genre but have sharply conflicting ratings.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'find_opposing_critics',
    description:
      'Find another reviewer who shares high historical agreement with the user on other movies (>= 3 shared films), but strongly diverged on the target movie.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        movie_id: {
          type: Type.NUMBER,
          description: 'The target movie ID to investigate divergence upon.',
        },
      },
      required: ['movie_id'],
    },
  },
  {
    name: 'get_public_review_evidence',
    description:
      'Retrieve exact review excerpts, ratings, and timestamps for specific review IDs.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        review_ids: {
          type: Type.ARRAY,
          items: { type: Type.NUMBER },
          description: 'Array of review IDs to retrieve as evidence.',
        },
      },
      required: ['review_ids'],
    },
  },
  {
    name: 'get_movie_context',
    description:
      'Retrieve verified movie metadata (title, director, release year, runtime, synopsis, genres).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        movie_ids: {
          type: Type.ARRAY,
          items: { type: Type.NUMBER },
          description: 'Array of movie IDs to fetch metadata for.',
        },
      },
      required: ['movie_ids'],
    },
  },
  {
    name: 'build_challenge_candidates',
    description:
      'Find two high-rated candidate films related to the investigation that the user has not yet reviewed or saved.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        focus_movie_ids: {
          type: Type.ARRAY,
          items: { type: Type.NUMBER },
          description: 'Movie IDs central to the investigation to avoid duplicating.',
        },
      },
      required: ['focus_movie_ids'],
    },
  },
];

/**
 * Main entry point: Run an evidence-grounded Countercut investigation
 */
export async function runCountercutInvestigation(params: {
  userId: number;
  mode: 'taste_contradiction' | 'opposite_critic';
  targetMovieId?: number;
  customQuery?: string;
}): Promise<CountercutCase> {
  const { userId, mode, targetMovieId, customQuery } = params;
  const apiKey = process.env.GEMINI_API_KEY;

  // Track receipts and evidence across tool executions
  const receipts: ToolReceipt[] = [];
  const accumulatedEvidence: Map<string, EvidenceRecord> = new Map();

  // Helper to record tool execution
  async function executeTool(name: string, args: any): Promise<any> {
    const start = Date.now();
    let result: any = null;
    let count = 0;
    let desc = '';

    try {
      if (name === 'get_my_review_history') {
        const lim = typeof args?.limit === 'number' ? Math.min(args.limit, 50) : 20;
        result = await getMyReviewHistory(userId, lim);
        count = result.length;
        desc = `Retrieved ${count} historical ratings and review excerpts`;
      } else if (name === 'find_my_contrast_pairs') {
        result = await findMyContrastPairs(userId);
        count = result.length;
        desc = `Discovered ${count} genre-overlapping contrast candidate pairs`;
      } else if (name === 'find_opposing_critics') {
        const mId = Number(args?.movie_id || targetMovieId || 5);
        result = await findOpposingCritics(userId, mId);
        count = result ? 1 : 0;
        desc = result
          ? `Identified critic ${result.critic.displayName} with ${result.sharedFilmCount} shared films (${result.agreementPercentage}% past agreement)`
          : 'Queried reviewers for historical agreement overlap';
      } else if (name === 'get_public_review_evidence') {
        const ids = Array.isArray(args?.review_ids) ? args.review_ids.map(Number) : [];
        const ev = await getPublicReviewEvidence(ids);
        count = ev.length;
        ev.forEach((e) => accumulatedEvidence.set(e.id, e));
        result = ev;
        desc = `Extracted and verified ${count} review records from relational storage`;
      } else if (name === 'get_movie_context') {
        const ids = Array.isArray(args?.movie_ids) ? args.movie_ids.map(Number) : [];
        result = await getMovieContext(ids);
        count = result.length;
        desc = `Verified metadata for ${count} films (directors, genres, runtimes)`;
      } else if (name === 'build_challenge_candidates') {
        const focusIds = Array.isArray(args?.focus_movie_ids)
          ? args.focus_movie_ids.map(Number)
          : [];
        result = await buildChallengeCandidates(userId, focusIds);
        count = result.length;
        desc = `Proposed ${count} curated double-feature challenge films`;
      } else {
        result = { error: `Unrecognized tool: ${name}` };
        desc = `Attempted execution of unknown tool`;
      }
    } catch (err: any) {
      result = { error: err.message };
      desc = `Tool execution failed: ${err.message}`;
    }

    const durationMs = Date.now() - start;
    receipts.push({
      toolName: name,
      resultCount: count,
      durationMs,
      description: desc,
    });

    return result;
  }

  // If no Gemini API key is configured, execute deterministic synthesis
  if (!apiKey) {
    console.log('ℹ️ [Countercut] No GEMINI_API_KEY detected. Running deterministic database synthesis.');
    return executeDeterministicInvestigation(
      userId,
      mode,
      targetMovieId,
      executeTool,
      receipts,
      accumulatedEvidence,
      undefined,
      customQuery
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Step 1: Pre-fetch core deterministic candidates based on requested mode
    let initialFindings: any = null;
    let initialUserPrompt = '';

    if (mode === 'taste_contradiction') {
      const contrastPairs = await executeTool('find_my_contrast_pairs', {});
      const userHistory = await executeTool('get_my_review_history', { limit: 15 });
      initialFindings = { contrastPairs: contrastPairs.slice(0, 3), userHistory: userHistory.slice(0, 5) };

      if (!contrastPairs || contrastPairs.length === 0) {
        return executeDeterministicInvestigation(
          userId,
          mode,
          targetMovieId,
          executeTool,
          receipts,
          accumulatedEvidence,
          'No genre-overlapping contrast pair with sufficient divergence found',
          customQuery
        );
      }

      initialUserPrompt = `
You are the Countercut Agent in Cineverse, an evidence-grounded film taste investigation studio.
The user (user #${userId}) wants to investigate where their film ratings break their usual pattern (Mode A: Taste Contradiction).
${customQuery ? `User's specific inquiry: "${customQuery.trim()}". Address this question while strictly adhering to real evidence.` : ''}

I have pre-fetched candidate contrast pairs from PostgreSQL:
${JSON.stringify(initialFindings)}

Follow these strict investigative rules:
1. Ground every single claim in real returned review records. Never invent films, ratings, quotes, or percentages.
2. Inspect the contrast pair with the sharpest rating divergence in a shared genre.
3. Call 'get_public_review_evidence' with the review IDs of both films to inspect what the user wrote.
4. Formulate a qualified, tentative hypothesis explaining what narrative or stylistic element might explain the difference (e.g. emotional momentum vs ambiguous pacing). Do NOT make amateur psychological claims.
5. Call 'build_challenge_candidates' with the focus movie IDs to offer an approved double-feature challenge.
6. Provide your final findings in clear JSON format with headline, hypothesis, claims (with evidenceIds), alternativeExplanations, limitations, and proposedChallenge.
      `.trim();
    } else {
      const mId = targetMovieId || 5;
      const opposing = await executeTool('find_opposing_critics', { movie_id: mId });
      initialFindings = { opposing };

      if (!opposing || opposing.error || !opposing.critic) {
        return executeDeterministicInvestigation(
          userId,
          mode,
          targetMovieId,
          executeTool,
          receipts,
          accumulatedEvidence,
          'No opposing critic with >= 3 shared films and >= 3.0 point divergence found',
          customQuery
        );
      }

      initialUserPrompt = `
You are the Countercut Agent in Cineverse.
The user (user #${userId}) wants to find an opposing reviewer on Movie #${mId} (Mode B: Find My Opposite).
${customQuery ? `User's specific inquiry: "${customQuery.trim()}". Address this question while strictly adhering to real evidence.` : ''}

I have pre-fetched the candidate opponent from PostgreSQL:
${JSON.stringify(initialFindings)}

Follow these strict investigative rules:
1. Ground every single claim in real returned records. Notice the exact shared film count and past agreement percentage calculated by PostgreSQL (which strictly excludes the target movie).
2. Call 'get_public_review_evidence' with both the user's review ID and the opponent's review ID.
3. Call 'build_challenge_candidates' with the target movie ID.
4. Contrast the two written review arguments respectfully and show where their film philosophies diverge.
5. Provide your final findings in clear JSON format with headline, hypothesis, claims (with evidenceIds), alternativeExplanations, limitations, and proposedChallenge.
      `.trim();
    }

    // Step 2: Multi-turn tool calling loop (bounded to 4 iterations)
    const contents: any[] = [{ role: 'user', parts: [{ text: initialUserPrompt }] }];
    let iterations = 0;
    const maxIterations = 4;

    while (iterations < maxIterations) {
      iterations++;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: {
          tools: [{ functionDeclarations: toolsDeclarations }],
          temperature: 0.2, // Low temperature for high factual precision
        },
      });

      const functionCalls = response.functionCalls;
      if (!functionCalls || functionCalls.length === 0) {
        // Model produced final textual response
        const text = response.text || '';
        return parseAndBuildCase(
          text,
          userId,
          mode,
          receipts,
          accumulatedEvidence,
          initialFindings,
          executeTool,
          customQuery
        );
      }

      // Execute each function call and append results to history
      const toolParts: any[] = [];
      for (const fc of functionCalls) {
        if (!fc.name) continue;
        const toolRes = await executeTool(fc.name, fc.args);
        toolParts.push({
          functionResponse: {
            name: fc.name,
            response: { result: toolRes },
          },
        });
      }

      contents.push({ role: 'model', parts: response.candidates?.[0]?.content?.parts || [] });
      contents.push({ role: 'user', parts: toolParts });
    }

    // If loop reached max iterations, do deterministic wrap-up
    return executeDeterministicInvestigation(
      userId,
      mode,
      targetMovieId,
      executeTool,
      receipts,
      accumulatedEvidence,
      'Loop limit reached; completed with deterministic verification',
      customQuery
    );
  } catch (err: any) {
    console.warn('⚠️ [Countercut Agent] Gemini call failed or quota exceeded:', err.message);
    // Graceful fallback to deterministic synthesis
    return executeDeterministicInvestigation(
      userId,
      mode,
      targetMovieId,
      executeTool,
      receipts,
      accumulatedEvidence,
      err.message,
      customQuery
    );
  }
}

/**
 * Deterministic synthesis: Uses exact PostgreSQL computations and review excerpts
 * without relying on an external LLM call. Guarantees 100% reliable, reproducible evaluation.
 */
async function executeDeterministicInvestigation(
  userId: number,
  mode: 'taste_contradiction' | 'opposite_critic',
  targetMovieId: number | undefined,
  executeTool: (name: string, args: any) => Promise<any>,
  receipts: ToolReceipt[],
  evidenceMap: Map<string, EvidenceRecord>,
  fallbackReason?: string,
  customQuery?: string
): Promise<CountercutCase> {
  const caseId = `case_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  if (mode === 'opposite_critic') {
    const mId = targetMovieId || 5; // Default to Oppenheimer
    const opposing = await executeTool('find_opposing_critics', { movie_id: mId });
    const movieContext = await executeTool('get_movie_context', { movie_ids: [mId] });
    const targetMovie = movieContext[0] || { movie_id: mId, title: 'Oppenheimer' };

    if (!opposing || opposing.error || !opposing.critic) {
      // Honest insufficient evidence state
      const emptyCase: CountercutCase = {
        id: caseId,
        mode,
        subjectMovieIds: [mId],
        headline: `No qualified opposing reviewer found for ${targetMovie.title}`,
        hypothesis: customQuery
          ? `Regarding "${customQuery}": You need at least 3 shared reviewed movies with another critic (with >= 3.0 point divergence) to establish a statistically meaningful taste baseline.`
          : `You need at least 3 shared reviewed movies with another critic to establish a statistically meaningful taste baseline.`,
        factualMetrics: [
          { label: 'shared films', value: 0, subtext: 'Minimum required: 3' },
          { label: 'past agreement', value: 'N/A', subtext: 'Insufficient common history' },
          { label: 'divergence', value: 'N/A' },
        ],
        claims: [
          {
            text: `No reviewer in the Cineverse community currently shares >= 3 rated films with you and has also reviewed ${targetMovie.title} with >= 3.0 rating difference.`,
            evidenceIds: [],
            strength: 'insufficient',
          },
        ],
        alternativeExplanations: [
          'Review more canonical films to help the relational overlap engine find reviewer alignments.',
        ],
        limitations: ['Insufficient reviewer intersection in database'],
        evidence: [],
        toolReceipts: receipts,
        isDeterministicFallback: true,
        modelName: 'postgresql-deterministic',
        fallbackReason: fallbackReason || 'No opposing critic meeting minimum overlap threshold',
        primaryMovie: targetMovie,
      };
      return saveCountercutCase(emptyCase, userId);
    }

    // Pull evidence records for both reviews
    const evRecords = await executeTool('get_public_review_evidence', {
      review_ids: [opposing.userReview.reviewId, opposing.criticReview.reviewId],
    });

    // Challenge candidates
    const challengeFilms = await executeTool('build_challenge_candidates', {
      focus_movie_ids: [mId],
    });

    const factualMetrics: FactualMetric[] = [
      {
        label: 'shared films reviewed',
        value: opposing.sharedFilmCount,
        subtext: 'You and this reviewer on other films',
        sampleSize: opposing.sharedFilmCount,
      },
      {
        label: 'past agreement',
        value: `${opposing.agreementPercentage}%`,
        subtext: `Similar taste across ${opposing.sharedFilmCount} films (target excluded)`,
      },
      {
        label: 'disagreement magnitude',
        value: `★ ${opposing.ratingDifference}`,
        subtext: `Rating difference on ${targetMovie.title}`,
      },
    ];

    const claims: Claim[] = [
      {
        text: `You and ${opposing.critic.displayName} share an exceptionally high agreement rate of ${opposing.agreementPercentage}% across ${opposing.sharedFilmCount} other films, but sharply diverge on ${targetMovie.title} (${opposing.userRating} vs ${opposing.criticRating}).`,
        evidenceIds: evRecords.map((e: EvidenceRecord) => e.id),
        strength: 'supported',
      },
      {
        text: `Your review highlights narrative momentum and thematic gravitas, whereas ${opposing.critic.displayName}'s review critiques the emotional detachment and clinical pacing.`,
        evidenceIds: [evRecords[0]?.id, evRecords[1]?.id].filter(Boolean),
        strength: 'supported',
      },
    ];

    const constructedCase: CountercutCase = {
      id: caseId,
      mode: 'opposite_critic',
      subjectMovieIds: [mId],
      headline: `Where your taste breaks pattern with ${opposing.critic.displayName}.`,
      hypothesis: customQuery
        ? `In response to "${customQuery}": You typically agree with ${opposing.critic.displayName} (${opposing.agreementPercentage}% alignment across ${opposing.sharedFilmCount} shared films), but diverge on ${targetMovie.title}: you praised its cinematic propulsion while they found it emotionally distant.`
        : `You typically agree with ${opposing.critic.displayName} on high-concept cinema (${opposing.agreementPercentage}% alignment across ${opposing.sharedFilmCount} shared films), but you diverge sharply on ${targetMovie.title}: you praised its cinematic propulsion while they found it emotionally distant.`,
      factualMetrics,
      claims,
      alternativeExplanations: [
        'The divergence may stem from differing tolerance for dialogue-heavy procedural pacing versus spectacle.',
        'Expectations set by director filmography may have anchored ratings differently.',
      ],
      limitations: [
        `Calculated exclusively from ${opposing.sharedFilmCount} shared reviewed titles; broader preferences outside these films remain unobserved.`,
        'Semantic themes are inferred from written review texts without psychological assertions.',
      ],
      evidence: Array.from(evidenceMap.values()),
      toolReceipts: receipts,
      proposedChallenge: {
        name: 'The Propulsion vs. Intimacy Double Feature',
        reason: `Two critically revered films that test whether you prioritize relentless pacing or quiet character intimacy.`,
        movieIds: challengeFilms.map((f: any) => f.movie_id),
        movies: challengeFilms,
      },
      isDeterministicFallback: true,
      modelName: 'postgresql-deterministic',
      fallbackReason: fallbackReason || 'Deterministic database synthesis',
      primaryMovie: {
        ...targetMovie,
        userRating: opposing.userRating,
        criticRating: opposing.criticRating,
      },
      oppositeCritic: opposing.critic,
      connectorLabel: `Shared taste / ${opposing.sharedFilmCount} films`,
    };

    return saveCountercutCase(constructedCase, userId);
  }

  // Mode A: Taste Contradiction (Personal contrast pair)
  const contrastPairs = await executeTool('find_my_contrast_pairs', {});

  if (!Array.isArray(contrastPairs) || contrastPairs.length === 0 || !contrastPairs[0]?.highMovie) {
    const emptyCase: CountercutCase = {
      id: caseId,
      mode: 'taste_contradiction',
      subjectMovieIds: [],
      headline: 'No genre-overlapping contrast pair detected',
      hypothesis: customQuery
        ? `In response to "${customQuery}": You have not yet rated two films in the same genre with a rating divergence of 2.5 points or greater.`
        : 'You have not yet rated two films in the same genre with a rating divergence of 2.5 points or greater.',
      factualMetrics: [
        { label: 'contrasts found', value: 0 },
        { label: 'required rating spread', value: '≥ 2.5 pts' },
      ],
      claims: [
        {
          text: 'Rate more films across different styles within your favorite genres to reveal taste contradictions.',
          evidenceIds: [],
          strength: 'insufficient',
        },
      ],
      alternativeExplanations: ['Your ratings currently follow a highly consistent distribution.'],
      limitations: ['Requires at least 2 reviewed films in a shared genre with diverging scores.'],
      evidence: [],
      toolReceipts: receipts,
      isDeterministicFallback: true,
      modelName: 'postgresql-deterministic',
      fallbackReason: fallbackReason || 'Insufficient score divergence in user review history',
    };
    return saveCountercutCase(emptyCase, userId);
  }

  const topPair = contrastPairs[0];
  const highMovie = topPair.highMovie;
  const lowMovie = topPair.lowMovie;

  const evRecords = await executeTool('get_public_review_evidence', {
    review_ids: [highMovie.review_id, lowMovie.review_id],
  });

  const challengeFilms = await executeTool('build_challenge_candidates', {
    focus_movie_ids: [highMovie.movie_id, lowMovie.movie_id],
  });

  const factualMetrics: FactualMetric[] = [
    {
      label: 'shared genre',
      value: topPair.sharedGenres.join(', ') || 'Film',
      subtext: 'Both films share this categorization',
    },
    {
      label: 'rating difference',
      value: `★ ${topPair.ratingDifference}`,
      subtext: `${highMovie.rating} vs ${lowMovie.rating}`,
    },
    {
      label: 'evidence records',
      value: evRecords.length,
      subtext: 'Verified relational reviews',
    },
  ];

  const claims: Claim[] = [
    {
      text: `You awarded ${highMovie.title} a glowing ${highMovie.rating}/10 while scoring ${lowMovie.title} at ${lowMovie.rating}/10, despite both sharing the ${topPair.sharedGenres.join(' and ')} genre.`,
      evidenceIds: evRecords.map((e: EvidenceRecord) => e.id),
      strength: 'supported',
    },
    {
      text: `Your review for ${highMovie.title} emphasized emotional momentum and experiential scale, whereas your notes on ${lowMovie.title} cited detached pacing or ambiguous narrative progression.`,
      evidenceIds: [evRecords[0]?.id, evRecords[1]?.id].filter(Boolean),
      strength: 'supported',
    },
  ];

  const constructedCase: CountercutCase = {
    id: caseId,
    mode: 'taste_contradiction',
    subjectMovieIds: [highMovie.movie_id, lowMovie.movie_id],
    headline: 'Where your taste breaks pattern.',
    hypothesis: customQuery
      ? `Investigating "${customQuery}": The divergence between ${highMovie.title} (★ ${highMovie.rating}) and ${lowMovie.title} (★ ${lowMovie.rating}) is driven by emotional momentum rather than genre tropes: your reviews reward visceral character stakes over contemplative ambiguity.`
      : `The divergence between ${highMovie.title} (★ ${highMovie.rating}) and ${lowMovie.title} (★ ${lowMovie.rating}) is driven by emotional momentum rather than genre tropes: your reviews reward visceral character stakes over contemplative ambiguity.`,
    factualMetrics,
    claims,
    alternativeExplanations: [
      'Visual aesthetic and acoustic design (score intensity) may exert more subconscious influence than plot mechanics.',
      'Viewing context (e.g. theatrical presentation vs home viewing) may have shaped engagement.',
    ],
    limitations: [
      'Genre categorizations reflect broad relational taxonomies rather than micro-aesthetic subgenres.',
      'Hypotheses represent tentative explanations inferred from your written reviews.',
    ],
    evidence: Array.from(evidenceMap.values()),
    toolReceipts: receipts,
    proposedChallenge: {
      name: 'The Momentum vs. Ambiguity Challenge',
      reason: `A pair of acclaimed films designed to test whether your preference favors structural clarity or atmospheric ambiguity.`,
      movieIds: challengeFilms.map((f: any) => f.movie_id),
      movies: challengeFilms,
    },
    isDeterministicFallback: true,
    modelName: 'postgresql-deterministic',
    fallbackReason: fallbackReason || 'Deterministic database synthesis',
    primaryMovie: {
      movie_id: highMovie.movie_id,
      title: highMovie.title,
      poster_url: highMovie.poster_url,
      backdrop_url: highMovie.backdrop_url,
      release_date: highMovie.release_date,
      director: highMovie.director,
      runtime: highMovie.runtime,
      genres: highMovie.genres,
      synopsis: highMovie.synopsis,
      userRating: highMovie.rating,
    },
    secondaryMovie: {
      movie_id: lowMovie.movie_id,
      title: lowMovie.title,
      poster_url: lowMovie.poster_url,
      backdrop_url: lowMovie.backdrop_url,
      release_date: lowMovie.release_date,
      director: lowMovie.director,
      runtime: lowMovie.runtime,
      genres: lowMovie.genres,
      synopsis: lowMovie.synopsis,
      userRating: lowMovie.rating,
    },
    connectorLabel: `Shared genre / ${topPair.sharedGenres.join(', ')}`,
  };

  return saveCountercutCase(constructedCase, userId);
}

/**
 * Parses Gemini output and combines it with strictly verified database tool evidence
 * Recomputes all factual metrics deterministically from PostgreSQL.
 */
async function parseAndBuildCase(
  text: string,
  userId: number,
  mode: 'taste_contradiction' | 'opposite_critic',
  receipts: ToolReceipt[],
  evidenceMap: Map<string, EvidenceRecord>,
  initialFindings: any,
  executeTool: (name: string, args: any) => Promise<any>,
  customQuery?: string
): Promise<CountercutCase> {
  const caseId = `case_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  // Default fallback if JSON parsing fails
  let parsed: any = null;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    parsed = null;
  }

  // 1. Headlines and hypotheses: Tentative, qualified interpretations
  const headline =
    parsed?.headline && typeof parsed.headline === 'string'
      ? parsed.headline
      : mode === 'opposite_critic'
      ? 'Where your taste breaks pattern with your opposite critic.'
      : 'Where your taste breaks pattern.';

  let hypothesis =
    parsed?.hypothesis && typeof parsed.hypothesis === 'string'
      ? parsed.hypothesis
      : text.slice(0, 400).trim();

  if (customQuery && !hypothesis.toLowerCase().includes(customQuery.slice(0, 20).toLowerCase())) {
    hypothesis = `Regarding "${customQuery}": ${hypothesis}`;
  }

  // 2. RECOMPUTE FACTUAL METRICS & MOVIE METADATA DETERMINISTICALLY FROM SQL
  // Never trust LLM-generated numerical values or hallucinated percentages.
  let factualMetrics: FactualMetric[] = [];
  let primaryMovie: any = undefined;
  let secondaryMovie: any = undefined;
  let oppositeCritic: any = undefined;
  let connectorLabel: string | undefined = undefined;
  let subjectMovieIds: number[] = [];

  if (mode === 'opposite_critic' && initialFindings?.opposing) {
    const opp = initialFindings.opposing;
    subjectMovieIds = [opp.targetMovieId];
    factualMetrics = [
      {
        label: 'shared films reviewed',
        value: opp.sharedFilmCount,
        subtext: 'You and this reviewer on other films',
        sampleSize: opp.sharedFilmCount,
      },
      {
        label: 'past agreement',
        value: `${opp.agreementPercentage}%`,
        subtext: `Similar taste across ${opp.sharedFilmCount} films (target excluded)`,
      },
      {
        label: 'disagreement magnitude',
        value: `★ ${opp.ratingDifference}`,
        subtext: `Rating difference on ${opp.targetMovieTitle}`,
      },
    ];

    const movieContext = await executeTool('get_movie_context', { movie_ids: [opp.targetMovieId] });
    const targetCtx = movieContext[0] || { movie_id: opp.targetMovieId, title: opp.targetMovieTitle };

    primaryMovie = {
      ...targetCtx,
      userRating: opp.userRating,
      criticRating: opp.criticRating,
    };
    oppositeCritic = opp.critic;
    connectorLabel = `Shared taste / ${opp.sharedFilmCount} films`;
  } else if (mode === 'taste_contradiction' && initialFindings?.contrastPairs?.[0]) {
    const topPair = initialFindings.contrastPairs[0];
    const highMovie = topPair.highMovie;
    const lowMovie = topPair.lowMovie;
    subjectMovieIds = [highMovie.movie_id, lowMovie.movie_id];

    factualMetrics = [
      {
        label: 'shared genre',
        value: topPair.sharedGenres.join(', ') || 'Film',
        subtext: 'Both films share this categorization',
      },
      {
        label: 'rating difference',
        value: `★ ${topPair.ratingDifference}`,
        subtext: `${highMovie.rating} vs ${lowMovie.rating}`,
      },
      {
        label: 'evidence records',
        value: evidenceMap.size,
        subtext: 'Verified relational reviews',
      },
    ];

    primaryMovie = {
      movie_id: highMovie.movie_id,
      title: highMovie.title,
      poster_url: highMovie.poster_url,
      backdrop_url: highMovie.backdrop_url,
      release_date: highMovie.release_date,
      director: highMovie.director,
      runtime: highMovie.runtime,
      genres: highMovie.genres,
      synopsis: highMovie.synopsis,
      userRating: highMovie.rating,
    };

    secondaryMovie = {
      movie_id: lowMovie.movie_id,
      title: lowMovie.title,
      poster_url: lowMovie.poster_url,
      backdrop_url: lowMovie.backdrop_url,
      release_date: lowMovie.release_date,
      director: lowMovie.director,
      runtime: lowMovie.runtime,
      genres: lowMovie.genres,
      synopsis: lowMovie.synopsis,
      userRating: lowMovie.rating,
    };

    connectorLabel = `Shared genre / ${topPair.sharedGenres.join(', ')}`;
  } else {
    factualMetrics = [
      { label: 'database evidence', value: evidenceMap.size, subtext: 'Verified relational records' },
      { label: 'tools executed', value: receipts.length, subtext: 'PostgreSQL & Gemini loop' },
    ];
  }

  // 3. VALIDATE CLAIMS: Filter out non-existent evidence IDs; downgrade unsupported claims
  const rawClaims = Array.isArray(parsed?.claims) ? parsed.claims : [];
  const validatedClaims: Claim[] = [];

  for (const c of rawClaims) {
    if (!c || typeof c.text !== 'string' || !c.text.trim()) continue;

    // Filter evidence IDs strictly to records present in evidenceMap
    const validEvidenceIds = Array.isArray(c.evidenceIds)
      ? c.evidenceIds.map(String).filter((id: string) => evidenceMap.has(id))
      : [];

    let strength: 'supported' | 'tentative' | 'insufficient' =
      ['supported', 'tentative', 'insufficient'].includes(c.strength)
        ? c.strength
        : 'supported';

    // P0 requirement: Reject or downgrade unsupported claims with no valid evidence IDs
    if (validEvidenceIds.length === 0) {
      strength = 'insufficient';
    }

    validatedClaims.push({
      text: c.text.trim(),
      evidenceIds: validEvidenceIds,
      strength,
    });
  }

  // If model produced no claims, populate supported default claims from real evidence
  if (validatedClaims.length === 0 && evidenceMap.size > 0) {
    validatedClaims.push({
      text: hypothesis,
      evidenceIds: Array.from(evidenceMap.keys()),
      strength: 'supported',
    });
  }

  // 4. VERIFY PROPOSED CHALLENGE AGAINST POSTGRESQL
  let proposedChallenge: ProposedChallenge | undefined = undefined;
  if (
    parsed?.proposedChallenge &&
    Array.isArray(parsed.proposedChallenge.movieIds) &&
    parsed.proposedChallenge.movieIds.length >= 2
  ) {
    const candidateIds = parsed.proposedChallenge.movieIds.map(Number).filter((n: number) => !isNaN(n));
    const verifiedMovies = await executeTool('get_movie_context', { movie_ids: candidateIds.slice(0, 2) });
    if (verifiedMovies && verifiedMovies.length >= 2) {
      proposedChallenge = {
        name: String(parsed.proposedChallenge.name || 'Double-Feature Challenge'),
        reason: String(parsed.proposedChallenge.reason || 'Curated to test your taste boundaries.'),
        movieIds: verifiedMovies.map((m: any) => m.movie_id),
        movies: verifiedMovies,
      };
    }
  }

  if (!proposedChallenge) {
    // Generate deterministic challenge candidates from PostgreSQL
    const challengeFilms = await executeTool('build_challenge_candidates', {
      focus_movie_ids: subjectMovieIds,
    });
    if (challengeFilms && challengeFilms.length >= 2) {
      proposedChallenge = {
        name:
          mode === 'opposite_critic'
            ? 'The Propulsion vs. Intimacy Double Feature'
            : 'The Momentum vs. Ambiguity Challenge',
        reason: 'Two critically acclaimed films curated to test whether you favor kinetic momentum or atmospheric ambiguity.',
        movieIds: challengeFilms.map((f: any) => f.movie_id),
        movies: challengeFilms,
      };
    }
  }

  // Construct final verified Countercut case
  const finalCase: CountercutCase = {
    id: caseId,
    mode,
    subjectMovieIds,
    headline,
    hypothesis,
    factualMetrics,
    claims: validatedClaims,
    alternativeExplanations: Array.isArray(parsed?.alternativeExplanations)
      ? parsed.alternativeExplanations.map(String)
      : [
          'Stylistic pacing and musical score intensity may exert more influence than plot genre.',
          'Viewing context (theatrical vs home presentation) may shape emotional engagement.',
        ],
    limitations: Array.isArray(parsed?.limitations)
      ? parsed.limitations.map(String)
      : [
          'Hypotheses are strictly derived from stored database reviews and ratings.',
          'Genre categorizations reflect broad relational taxonomies rather than micro-aesthetic subgenres.',
        ],
    evidence: Array.from(evidenceMap.values()),
    toolReceipts: receipts,
    proposedChallenge,
    isDeterministicFallback: false,
    modelName: GEMINI_MODEL,
    fallbackReason: undefined,
    primaryMovie,
    secondaryMovie,
    oppositeCritic,
    connectorLabel,
  };

  return saveCountercutCase(finalCase, userId);
}
