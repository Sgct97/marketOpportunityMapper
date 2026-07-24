import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  absoluteShareUrl,
  evaluateShare,
  expiresAtFromOption,
  generateShareToken,
  isShareActive,
  resolveShareByToken,
  type PresentationShareRow,
} from './presentation-shares';

function sampleShare(
  overrides: Partial<PresentationShareRow> = {}
): PresentationShareRow {
  return {
    id: 'share-1',
    project_id: 'project-1',
    token: 'tok_abc',
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00.000Z',
    expires_at: null,
    revoked_at: null,
    label: null,
    ...overrides,
  };
}

describe('generateShareToken', () => {
  it('returns unguessable base64url tokens of stable length', () => {
    const a = generateShareToken();
    const b = generateShareToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBeGreaterThanOrEqual(32);
    expect(a).not.toBe(b);
  });
});

describe('expiresAtFromOption', () => {
  const from = new Date('2026-07-24T12:00:00.000Z');

  it('adds 24 hours, 7 days, or 30 days', () => {
    expect(expiresAtFromOption('24h', from)?.toISOString()).toBe('2026-07-25T12:00:00.000Z');
    expect(expiresAtFromOption('7d', from)?.toISOString()).toBe('2026-07-31T12:00:00.000Z');
    expect(expiresAtFromOption('30d', from)?.toISOString()).toBe('2026-08-23T12:00:00.000Z');
  });

  it('returns null for never', () => {
    expect(expiresAtFromOption('never', from)).toBeNull();
  });
});

describe('evaluateShare / isShareActive', () => {
  const now = new Date('2026-07-24T12:00:00.000Z');

  it('accepts active never-expiring shares', () => {
    const share = sampleShare();
    expect(evaluateShare(share, now)).toEqual({ ok: true, share });
    expect(isShareActive(share, now)).toBe(true);
  });

  it('rejects missing shares', () => {
    expect(evaluateShare(null, now)).toEqual({ ok: false, reason: 'missing' });
    expect(evaluateShare(undefined, now)).toEqual({ ok: false, reason: 'missing' });
  });

  it('rejects revoked shares', () => {
    const share = sampleShare({ revoked_at: '2026-07-20T00:00:00.000Z' });
    expect(evaluateShare(share, now)).toEqual({ ok: false, reason: 'revoked' });
    expect(isShareActive(share, now)).toBe(false);
  });

  it('rejects expired shares (expires_at in the past or now)', () => {
    const past = sampleShare({ expires_at: '2026-07-24T11:59:59.000Z' });
    const exact = sampleShare({ expires_at: '2026-07-24T12:00:00.000Z' });
    expect(evaluateShare(past, now)).toEqual({ ok: false, reason: 'expired' });
    expect(evaluateShare(exact, now)).toEqual({ ok: false, reason: 'expired' });
    expect(isShareActive(past, now)).toBe(false);
  });

  it('accepts shares that expire in the future', () => {
    const share = sampleShare({ expires_at: '2026-07-24T12:00:01.000Z' });
    expect(evaluateShare(share, now)).toEqual({ ok: true, share });
  });
});

describe('resolveShareByToken', () => {
  it('returns missing for blank tokens without querying', async () => {
    const maybeSingle = vi.fn();
    const supabase = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({ maybeSingle }),
        }),
      })),
    } as unknown as SupabaseClient;

    expect(await resolveShareByToken(supabase, '  ')).toEqual({
      ok: false,
      reason: 'missing',
    });
    expect(maybeSingle).not.toHaveBeenCalled();
  });

  it('returns missing when no row is found', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      })),
    } as unknown as SupabaseClient;

    expect(await resolveShareByToken(supabase, 'nope')).toEqual({
      ok: false,
      reason: 'missing',
    });
  });

  it('evaluates a found row for expiry and revoke', async () => {
    const share = sampleShare({
      expires_at: '2026-01-01T00:00:00.000Z',
      revoked_at: null,
    });
    const supabase = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: share, error: null }),
          }),
        }),
      })),
    } as unknown as SupabaseClient;

    expect(
      await resolveShareByToken(supabase, 'tok_abc', new Date('2026-07-24T12:00:00.000Z'))
    ).toEqual({ ok: false, reason: 'expired' });
  });
});

describe('absoluteShareUrl', () => {
  it('builds /p/[token] under the origin without a trailing slash', () => {
    expect(absoluteShareUrl('https://app.example.com/', 'abc')).toBe(
      'https://app.example.com/p/abc'
    );
  });
});

describe('share public path matching', () => {
  function isPublicPath(pathname: string): boolean {
    const PUBLIC_PATHS = ['/login', '/auth/callback', '/api/zcta-boundaries'];
    if (pathname === '/p' || pathname.startsWith('/p/')) return true;
    return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`));
  }

  it('allows /p/[token] without treating /projects as public', () => {
    expect(isPublicPath('/p/tok_abc')).toBe(true);
    expect(isPublicPath('/api/zcta-boundaries')).toBe(true);
    expect(isPublicPath('/projects/xyz')).toBe(false);
    expect(isPublicPath('/projects')).toBe(false);
  });
});
