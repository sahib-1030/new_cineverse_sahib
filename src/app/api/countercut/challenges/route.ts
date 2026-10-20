export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { withTransaction } from '@/lib/db';

function badRequest(message: string, status = 400): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Sign in to create a challenge watchlist.' }, { status: 401 });
    }

    const body = await request.json();
    const caseId = body?.caseId;
    const requestedIds = body?.movieIds;

    if (typeof caseId !== 'string' || !/^case_[a-zA-Z0-9_-]{1,59}$/.test(caseId)) {
      return NextResponse.json({ error: 'An originating Countercut case is required.' }, { status: 400 });
    }
    if (!Array.isArray(requestedIds) || requestedIds.length !== 2 ||
        requestedIds.some((id: unknown) => typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) ||
        new Set(requestedIds).size !== 2) {
      return NextResponse.json({ error: 'Approve exactly two distinct films.' }, { status: 400 });
    }

    const created = await withTransaction(async tx => {
      // Serializes concurrent confirmations for the same case on PostgreSQL.
      // A case created by someone else must not be used to make a watchlist.
      const caseRes = await tx.query<{ proposed_challenge: any }>(
        `SELECT proposed_challenge FROM agent_cases
         WHERE case_id = $1 AND user_id = $2 FOR UPDATE;`,
        [caseId, authUser.user_id]
      );
      if (caseRes.rows.length === 0) throw badRequest('Countercut case not found or not owned by you.', 404);

      const raw = caseRes.rows[0].proposed_challenge;
      const proposed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const expected = proposed?.movieIds;
      if (!Array.isArray(expected) || expected.length !== 2 ||
          expected.some((id: unknown) => !Number.isSafeInteger(Number(id)))) {
        throw badRequest('This case does not have an approved two-film proposal.', 409);
      }
      const proposedIds = expected.map(Number);
      const approvedIds = requestedIds.map(Number);
      if (proposedIds.some((id: number) => !approvedIds.includes(id)) ||
          approvedIds.some((id: number) => !proposedIds.includes(id)) ||
          new Set(proposedIds).size !== 2) {
        throw badRequest('The requested films must exactly match the originating case proposal.', 400);
      }

      const movieRes = await tx.query(
        'SELECT movie_id FROM movies WHERE movie_id = ANY($1::int[]);',
        [proposedIds]
      );
      if (movieRes.rows.length !== 2) throw badRequest('A proposed film no longer exists.', 409);

      // The case ID is an idempotency key: repeat clicks return the same list.
      const caseMarker = `Countercut case: ${caseId}`;
      const existing = await tx.query<{ watchlist_id: number }>(
        `SELECT watchlist_id FROM watchlists
         WHERE user_id = $1 AND RIGHT(COALESCE(description, ''), LENGTH($2)) = $2
         LIMIT 1;`,
        [authUser.user_id, caseMarker]
      );
      if (existing.rows.length) {
        return { watchlistId: existing.rows[0].watchlist_id, alreadyExisted: true };
      }

      const title = String(proposed.name || 'Countercut double feature').slice(0, 180).trim();
      const reason = String(proposed.reason || 'Curated by Countercut').slice(0, 500);
      const description = `${reason}\n${caseMarker}`;
      const listRes = await tx.query<{ watchlist_id: number }>(
        `INSERT INTO watchlists (user_id, name, description, is_public)
         VALUES ($1, $2, $3, FALSE) RETURNING watchlist_id;`,
        [authUser.user_id, title, description]
      );
      const watchlistId = listRes.rows[0].watchlist_id;
      for (const movieId of proposedIds) {
        await tx.query(
          `INSERT INTO watchlist_items (watchlist_id, movie_id)
           VALUES ($1, $2) ON CONFLICT (watchlist_id, movie_id) DO NOTHING;`,
          [watchlistId, movieId]
        );
      }

      return { watchlistId, alreadyExisted: false };
    });

    return NextResponse.json({
      success: true,
      watchlistId: created.watchlistId,
      alreadyExisted: created.alreadyExisted,
      message: created.alreadyExisted ? 'Challenge already saved.' : 'Private double-feature challenge saved.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Could not create challenge.' },
      { status: typeof error.status === 'number' ? error.status : 500 }
    );
  }
}
