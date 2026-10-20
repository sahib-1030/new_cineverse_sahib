import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

const SESSION_COOKIE_NAME = 'cineverse_session';
function getSessionSecret(): string {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'cineverse-secure-session-secret-key-2026') {
      throw new Error('[Security Exception] SESSION_SECRET must be explicitly configured in production environment.');
    }
    return process.env.SESSION_SECRET;
  }
  return process.env.SESSION_SECRET || 'cineverse-secure-session-secret-key-2026';
}
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface AuthenticatedUser {
  user_id: number;
  username: string;
  display_name: string;
  email: string;
  avatar_url: string;
}

/**
 * Strong password hashing using Node.js crypto scrypt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

/**
 * Verify password against stored scrypt hash with timing attack resistance
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || typeof storedHash !== 'string') return false;
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;

  const [, salt, hash] = parts;
  try {
    const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Creates a signed tamper-proof session token
 */
export function signSessionToken(payload: { userId: number; username: string }): string {
  const data = JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  });
  const encodedData = Buffer.from(data).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encodedData)
    .digest('base64url');
  return `${encodedData}.${signature}`;
}

/**
 * Verifies and decodes a signed session token
 */
export function verifySessionToken(token: string): { userId: number; username: string } | null {
  if (!token || typeof token !== 'string') return null;
  const [encodedData, signature] = token.split('.');
  if (!encodedData || !signature) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encodedData)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expectedSigBuf = Buffer.from(expectedSig);

  if (sigBuf.length !== expectedSigBuf.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(sigBuf, expectedSigBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedData, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return { userId: payload.userId, username: payload.username };
  } catch {
    return null;
  }
}

/**
 * Server-side session retrieval for Next.js Route Handlers or Server Components
 */
export async function getAuthenticatedUser(request?: NextRequest): Promise<AuthenticatedUser | null> {
  let token: string | undefined;

  if (request) {
    token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  } else {
    try {
      const cookieStore = cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      return null;
    }
  }

  if (!token) return null;

  const session = verifySessionToken(token);
  if (!session) return null;

  // Seed users 1–6 have published, shared fixture credentials.
  // They must never authenticate against a public deployment by default.
  if (process.env.NODE_ENV === 'production' &&
      process.env.ALLOW_DEMO_LOGIN !== 'true' &&
      Number.isInteger(session.userId) &&
      session.userId >= 1 && session.userId <= 6) {
    return null;
  }

  try {
    const res = await query<AuthenticatedUser>(
      `SELECT user_id, username, display_name, email, avatar_url FROM users WHERE user_id = $1;`,
      [session.userId]
    );
    return res.rows[0] || null;
  } catch (err) {
    console.error('Error fetching authenticated user:', err);
    return null;
  }
}

export const SESSION_CONFIG = {
  name: SESSION_COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
};
