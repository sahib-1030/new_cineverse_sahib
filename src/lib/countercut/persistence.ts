import { query } from '@/lib/db';
import { CountercutCase, EvidenceRecord } from './types';

/**
 * Ensures Countercut tables exist and applies non-destructive schema migrations
 */
export async function ensureCountercutTables(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS agent_cases (
      case_id VARCHAR(64) PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      mode VARCHAR(32) NOT NULL,
      subject_movie_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      opposite_user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
      headline TEXT NOT NULL,
      hypothesis TEXT NOT NULL,
      factual_metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
      claims JSONB NOT NULL DEFAULT '[]'::jsonb,
      alternative_explanations JSONB NOT NULL DEFAULT '[]'::jsonb,
      limitations JSONB NOT NULL DEFAULT '[]'::jsonb,
      tool_receipts JSONB NOT NULL DEFAULT '[]'::jsonb,
      proposed_challenge JSONB DEFAULT NULL,
      primary_movie JSONB DEFAULT NULL,
      secondary_movie JSONB DEFAULT NULL,
      opposite_critic JSONB DEFAULT NULL,
      connector_label TEXT DEFAULT NULL,
      is_fallback BOOLEAN DEFAULT FALSE,
      fallback_reason TEXT DEFAULT NULL,
      model_name VARCHAR(64) DEFAULT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure new metadata columns exist idempotently on agent_cases
  await query(`ALTER TABLE agent_cases ADD COLUMN IF NOT EXISTS primary_movie JSONB DEFAULT NULL;`);
  await query(`ALTER TABLE agent_cases ADD COLUMN IF NOT EXISTS secondary_movie JSONB DEFAULT NULL;`);
  await query(`ALTER TABLE agent_cases ADD COLUMN IF NOT EXISTS opposite_critic JSONB DEFAULT NULL;`);
  await query(`ALTER TABLE agent_cases ADD COLUMN IF NOT EXISTS connector_label TEXT DEFAULT NULL;`);
  await query(`ALTER TABLE agent_cases ADD COLUMN IF NOT EXISTS is_fallback BOOLEAN DEFAULT FALSE;`);
  await query(`ALTER TABLE agent_cases ADD COLUMN IF NOT EXISTS fallback_reason TEXT DEFAULT NULL;`);
  await query(`ALTER TABLE agent_cases ADD COLUMN IF NOT EXISTS model_name VARCHAR(64) DEFAULT NULL;`);

  await query(`
    CREATE TABLE IF NOT EXISTS agent_case_evidence (
      evidence_id VARCHAR(64) NOT NULL,
      case_id VARCHAR(64) NOT NULL REFERENCES agent_cases(case_id) ON DELETE CASCADE,
      source_type VARCHAR(32) NOT NULL,
      target_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      snippet TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (case_id, evidence_id)
    );
  `);

  // Non-destructive migration: convert single PK (evidence_id) to composite PK (case_id, evidence_id)
  try {
    const pkCheck = await query<any>(`
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'agent_case_evidence' AND tc.constraint_type = 'PRIMARY KEY';
    `);
    const pkCols = pkCheck.rows.map((r: any) => r.column_name);
    if (pkCols.length === 1 && pkCols[0] === 'evidence_id') {
      await query(`ALTER TABLE agent_case_evidence DROP CONSTRAINT agent_case_evidence_pkey;`);
      await query(`ALTER TABLE agent_case_evidence ADD PRIMARY KEY (case_id, evidence_id);`);
    }
  } catch (migErr) {
    // Migration check non-critical if table was just created with composite PK
  }

  await query(`CREATE INDEX IF NOT EXISTS idx_agent_cases_user ON agent_cases(user_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_agent_cases_created ON agent_cases(created_at DESC);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_agent_case_evidence_case ON agent_case_evidence(case_id);`);
}

/**
 * Persists an authentic Countercut case and its evidence records
 */
export async function saveCountercutCase(
  caseData: CountercutCase,
  userId: number
): Promise<CountercutCase> {
  await ensureCountercutTables();

  const insertCaseSql = `
    INSERT INTO agent_cases (
      case_id, user_id, mode, subject_movie_ids, opposite_user_id,
      headline, hypothesis, factual_metrics, claims,
      alternative_explanations, limitations, tool_receipts,
      proposed_challenge, primary_movie, secondary_movie,
      opposite_critic, connector_label, is_fallback,
      fallback_reason, model_name, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, CURRENT_TIMESTAMP)
    ON CONFLICT (case_id) DO UPDATE SET
      headline = EXCLUDED.headline,
      hypothesis = EXCLUDED.hypothesis,
      factual_metrics = EXCLUDED.factual_metrics,
      claims = EXCLUDED.claims,
      alternative_explanations = EXCLUDED.alternative_explanations,
      limitations = EXCLUDED.limitations,
      tool_receipts = EXCLUDED.tool_receipts,
      proposed_challenge = EXCLUDED.proposed_challenge,
      primary_movie = EXCLUDED.primary_movie,
      secondary_movie = EXCLUDED.secondary_movie,
      opposite_critic = EXCLUDED.opposite_critic,
      connector_label = EXCLUDED.connector_label,
      is_fallback = EXCLUDED.is_fallback,
      fallback_reason = EXCLUDED.fallback_reason,
      model_name = EXCLUDED.model_name
    RETURNING *;
  `;

  await query(insertCaseSql, [
    caseData.id,
    userId,
    caseData.mode,
    JSON.stringify(caseData.subjectMovieIds || []),
    caseData.oppositeCritic?.userId || null,
    caseData.headline,
    caseData.hypothesis,
    JSON.stringify(caseData.factualMetrics || []),
    JSON.stringify(caseData.claims || []),
    JSON.stringify(caseData.alternativeExplanations || []),
    JSON.stringify(caseData.limitations || []),
    JSON.stringify(caseData.toolReceipts || []),
    caseData.proposedChallenge ? JSON.stringify(caseData.proposedChallenge) : null,
    caseData.primaryMovie ? JSON.stringify(caseData.primaryMovie) : null,
    caseData.secondaryMovie ? JSON.stringify(caseData.secondaryMovie) : null,
    caseData.oppositeCritic ? JSON.stringify(caseData.oppositeCritic) : null,
    caseData.connectorLabel || null,
    Boolean(caseData.isDeterministicFallback),
    caseData.fallbackReason || null,
    caseData.modelName || null,
  ]);

  // Insert case-scoped evidence items
  if (caseData.evidence && caseData.evidence.length > 0) {
    for (const ev of caseData.evidence) {
      const mergedMeta = {
        ...(ev.metadata || {}),
        author: ev.author,
        rating: ev.rating,
        isSpoiler: ev.isSpoiler,
      };

      await query(
        `INSERT INTO agent_case_evidence (
          evidence_id, case_id, source_type, target_id, title, snippet, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (case_id, evidence_id) DO UPDATE SET
          source_type = EXCLUDED.source_type,
          target_id = EXCLUDED.target_id,
          title = EXCLUDED.title,
          snippet = EXCLUDED.snippet,
          metadata = EXCLUDED.metadata;`,
        [
          ev.id,
          caseData.id,
          ev.sourceType,
          ev.targetId,
          ev.title,
          ev.snippet,
          JSON.stringify(mergedMeta),
        ]
      );
    }
  }

  return caseData;
}

/**
 * Retrieves a Countercut case by ID with full evidence
 */
export async function getCountercutCaseById(
  caseId: string,
  userId?: number
): Promise<CountercutCase | null> {
  await ensureCountercutTables();

  let sql = `SELECT * FROM agent_cases WHERE case_id = $1`;
  const params: any[] = [caseId];
  if (userId) {
    sql += ` AND user_id = $2`;
    params.push(userId);
  }

  const res = await query<any>(sql, params);
  if (res.rows.length === 0) return null;

  const row = res.rows[0];

  const evRes = await query<any>(
    `SELECT * FROM agent_case_evidence WHERE case_id = $1 ORDER BY created_at ASC;`,
    [caseId]
  );

  const evidence: EvidenceRecord[] = evRes.rows.map((e: any) => {
    const meta = typeof e.metadata === 'string' ? JSON.parse(e.metadata) : (e.metadata || {});
    return {
      id: e.evidence_id,
      sourceType: e.source_type,
      targetId: e.target_id,
      title: e.title,
      snippet: e.snippet,
      author: meta.author,
      rating: meta.rating !== undefined ? Number(meta.rating) : undefined,
      isSpoiler: Boolean(meta.isSpoiler),
      metadata: meta,
    };
  });

  return {
    id: row.case_id,
    mode: row.mode,
    subjectMovieIds: typeof row.subject_movie_ids === 'string' ? JSON.parse(row.subject_movie_ids) : row.subject_movie_ids,
    headline: row.headline,
    hypothesis: row.hypothesis,
    factualMetrics: typeof row.factual_metrics === 'string' ? JSON.parse(row.factual_metrics) : row.factual_metrics,
    claims: typeof row.claims === 'string' ? JSON.parse(row.claims) : row.claims,
    alternativeExplanations: typeof row.alternative_explanations === 'string' ? JSON.parse(row.alternative_explanations) : row.alternative_explanations,
    limitations: typeof row.limitations === 'string' ? JSON.parse(row.limitations) : row.limitations,
    toolReceipts: typeof row.tool_receipts === 'string' ? JSON.parse(row.tool_receipts) : row.tool_receipts,
    proposedChallenge: row.proposed_challenge ? (typeof row.proposed_challenge === 'string' ? JSON.parse(row.proposed_challenge) : row.proposed_challenge) : undefined,
    primaryMovie: row.primary_movie ? (typeof row.primary_movie === 'string' ? JSON.parse(row.primary_movie) : row.primary_movie) : undefined,
    secondaryMovie: row.secondary_movie ? (typeof row.secondary_movie === 'string' ? JSON.parse(row.secondary_movie) : row.secondary_movie) : undefined,
    oppositeCritic: row.opposite_critic ? (typeof row.opposite_critic === 'string' ? JSON.parse(row.opposite_critic) : row.opposite_critic) : undefined,
    connectorLabel: row.connector_label || undefined,
    isDeterministicFallback: row.is_fallback !== undefined ? Boolean(row.is_fallback) : false,
    fallbackReason: row.fallback_reason || undefined,
    modelName: row.model_name || undefined,
    evidence,
    createdAt: row.created_at,
  };
}

/**
 * Retrieves the latest Countercut case for a user
 */
export async function getLatestCountercutCase(userId: number): Promise<CountercutCase | null> {
  await ensureCountercutTables();

  const res = await query<any>(
    `SELECT case_id FROM agent_cases WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1;`,
    [userId]
  );

  if (res.rows.length === 0) return null;
  return getCountercutCaseById(res.rows[0].case_id, userId);
}
