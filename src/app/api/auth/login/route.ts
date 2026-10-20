export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyPassword, signSessionToken, SESSION_CONFIG } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const { rows } = await query(
      `SELECT user_id, username, email, display_name, avatar_url, password_hash 
       FROM users 
       WHERE LOWER(email) = LOWER($1);`,
      [email.trim()]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = rows[0];

    // All six seeded accounts share a public fixture password.
    if (process.env.NODE_ENV === 'production' &&
        process.env.ALLOW_DEMO_LOGIN !== 'true' &&
        Number(user.user_id) >= 1 && Number(user.user_id) <= 6) {
      return NextResponse.json(
        { error: 'Demo accounts are disabled on public deployments.' },
        { status: 403 }
      );
    }
    const isPasswordValid = verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const token = signSessionToken({
      userId: user.user_id,
      username: user.username,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        user_id: user.user_id,
        username: user.username,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        email: user.email,
      },
    });

    // Set secure HTTP-only cookie
    response.cookies.set(SESSION_CONFIG.name, token, SESSION_CONFIG.options);

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
