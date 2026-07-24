import { randomBytes } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export type ShareExpiryOption = '24h' | '7d' | '30d' | 'never';

export interface PresentationShareRow {
  id: string;
  project_id: string;
  token: string;
  created_by: string;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  label: string | null;
}

export type ShareResolveResult =
  | { ok: true; share: PresentationShareRow }
  | { ok: false; reason: 'missing' | 'revoked' | 'expired' };

export function generateShareToken(): string {
  return randomBytes(24).toString('base64url');
}

export function expiresAtFromOption(
  option: ShareExpiryOption,
  from: Date = new Date()
): Date | null {
  if (option === 'never') return null;
  const ms =
    option === '24h'
      ? 24 * 60 * 60 * 1000
      : option === '7d'
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;
  return new Date(from.getTime() + ms);
}

export function isShareActive(
  share: Pick<PresentationShareRow, 'revoked_at' | 'expires_at'>,
  now: Date = new Date()
): boolean {
  if (share.revoked_at) return false;
  if (share.expires_at && new Date(share.expires_at).getTime() <= now.getTime()) {
    return false;
  }
  return true;
}

export function evaluateShare(
  share: PresentationShareRow | null | undefined,
  now: Date = new Date()
): ShareResolveResult {
  if (!share) return { ok: false, reason: 'missing' };
  if (share.revoked_at) return { ok: false, reason: 'revoked' };
  if (share.expires_at && new Date(share.expires_at).getTime() <= now.getTime()) {
    return { ok: false, reason: 'expired' };
  }
  return { ok: true, share };
}

/** Resolve a share token using a service-role (or otherwise privileged) client. */
export async function resolveShareByToken(
  supabase: SupabaseClient,
  token: string,
  now: Date = new Date()
): Promise<ShareResolveResult> {
  const trimmed = token.trim();
  if (!trimmed) return { ok: false, reason: 'missing' };

  const { data, error } = await supabase
    .from('presentation_shares')
    .select('id, project_id, token, created_by, created_at, expires_at, revoked_at, label')
    .eq('token', trimmed)
    .maybeSingle();

  if (error || !data) return { ok: false, reason: 'missing' };
  return evaluateShare(data as PresentationShareRow, now);
}

export function absoluteShareUrl(origin: string, token: string): string {
  const base = origin.replace(/\/$/, '');
  return `${base}/p/${token}`;
}
