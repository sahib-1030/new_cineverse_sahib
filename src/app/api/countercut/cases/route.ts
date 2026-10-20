export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { runCountercutInvestigation } from '@/lib/countercut/agent';
import { getCountercutCaseById, getLatestCountercutCase } from '@/lib/countercut/persistence';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');

    let caseData = null;
    if (caseId) {
      caseData = await getCountercutCaseById(caseId, authUser.user_id);
    } else {
      caseData = await getLatestCountercutCase(authUser.user_id);
    }

    return NextResponse.json({
      success: true,
      case: caseData,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required to run an investigation' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const mode = body.mode === 'opposite_critic' ? 'opposite_critic' : 'taste_contradiction';
    const targetMovieId = body.targetMovieId ? parseInt(body.targetMovieId, 10) : undefined;
    const customQuery = typeof body.customQuery === 'string' && body.customQuery.trim().length > 0 
      ? body.customQuery.trim() 
      : undefined;

    const result = await runCountercutInvestigation({
      userId: authUser.user_id,
      mode,
      targetMovieId,
      customQuery,
    });

    return NextResponse.json({
      success: true,
      case: result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
