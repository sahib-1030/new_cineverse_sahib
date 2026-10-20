export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { SESSION_CONFIG } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_CONFIG.name, '', {
    ...SESSION_CONFIG.options,
    maxAge: 0,
  });
  return response;
}
