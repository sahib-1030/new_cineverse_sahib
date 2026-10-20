export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword, signSessionToken, SESSION_CONFIG } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, displayName, email, password } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email, and password are required' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const cleanEmail = email.trim().toLowerCase();

    if (cleanUsername.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 alphanumeric characters' },
        { status: 400 }
      );
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check for existing user
    const existing = await query(
      `SELECT user_id FROM users WHERE LOWER(email) = $1 OR LOWER(username) = $2;`,
      [cleanEmail, cleanUsername]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'An account with this email or username already exists' },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);
    const cleanDisplayName = (displayName || username).trim();

    const { rows } = await query(
      `INSERT INTO users (username, email, display_name, password_hash) 
       VALUES ($1, $2, $3, $4) 
       RETURNING user_id, username, email, display_name, avatar_url, created_at;`,
      [cleanUsername, cleanEmail, cleanDisplayName, passwordHash]
    );

    const user = rows[0];

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

    response.cookies.set(SESSION_CONFIG.name, token, SESSION_CONFIG.options);
    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Email or username already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Internal server error during registration' },
      { status: 500 }
    );
  }
}
