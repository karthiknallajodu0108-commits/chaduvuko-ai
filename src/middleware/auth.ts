import type { Request, Response, NextFunction } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateProfile } from '../db/repository.ts';
import { SupabaseSchemaError } from '../db/supabase.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in to continue.' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Authentication token is missing.' });
    return;
  }

  // Step 1: Strictly verify the caller's Firebase ID token (only token failures return 401)
  let decodedToken: DecodedIdToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(token);
  } catch (error) {
    console.error('Auth verification failed:', error instanceof Error ? error.message : 'Unknown error');
    res.status(401).json({ error: 'Your session is invalid or expired. Please sign in again.' });
    return;
  }

  req.user = decodedToken;

  // Step 2: Safely ensure the authenticated user's profile row exists using the verified UID
  try {
    await getOrCreateProfile(
      decodedToken.uid,
      decodedToken.email || '',
      decodedToken.name || ''
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database operation failed.';
    console.error('Profile bootstrap failed for verified user:', message);
    const status = error instanceof SupabaseSchemaError ? error.statusCode : 503;
    res.status(status).json({ error: message });
    return;
  }

  next();
};
