export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getTraceById, getLatestTrace, captureReviewTrace, ensureTraceTables } from '@/lib/trace';

export async function GET(request: NextRequest) {
  try {
    await ensureTraceTables();
    const { searchParams } = new URL(request.url);
    const traceId = searchParams.get('traceId');
    const movieId = searchParams.get('movieId');

    if (traceId) {
      const trace = await getTraceById(parseInt(traceId, 10));
      if (!trace) {
        return NextResponse.json({ error: 'Trace not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, trace });
    }

    const latestTrace = await getLatestTrace(movieId ? parseInt(movieId, 10) : undefined);
    if (!latestTrace) {
      return NextResponse.json(
        { success: true, trace: null, message: 'No traces recorded yet. Rate a film to generate provenance lineage.' },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true, trace: latestTrace });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required to execute a trace mutation' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { movieId, rating, reviewText, hasSpoilers } = body;
    const effectiveUserId = authUser.user_id;

    if (!movieId || rating === undefined) {
      return NextResponse.json(
        { error: 'movieId and rating are required to generate a trace' },
        { status: 400 }
      );
    }

    const numRating = parseFloat(rating);
    if (isNaN(numRating) || numRating < 1.0 || numRating > 10.0) {
      return NextResponse.json({ error: 'Rating must be between 1.0 and 10.0' }, { status: 400 });
    }

    const traceResult = await captureReviewTrace({
      userId: effectiveUserId,
      movieId: parseInt(movieId, 10),
      rating: numRating,
      reviewText: typeof reviewText === 'string' ? reviewText.trim() : '',
      hasSpoilers: Boolean(hasSpoilers),
    });

    return NextResponse.json({
      success: true,
      trace: traceResult.trace,
      review: traceResult.review,
      updatedMovie: traceResult.updatedMovie,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
