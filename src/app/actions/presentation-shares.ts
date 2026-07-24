'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { isAuthDisabled } from '@/lib/auth-config';
import { createDataClient, getActingUserId } from '@/lib/supabase/data';
import {
  absoluteShareUrl,
  expiresAtFromOption,
  generateShareToken,
  type PresentationShareRow,
  type ShareExpiryOption,
} from '@/lib/presentation-shares';

async function assertOwnsProject(
  projectId: string
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const supabase = await createDataClient();
  const userId = await getActingUserId(supabase);
  if (!userId) {
    return { error: 'Could not verify your account.', ok: false };
  }

  if (isAuthDisabled()) {
    const { data } = await supabase.from('projects').select('id').eq('id', projectId).maybeSingle();
    if (!data) return { error: 'Project not found.', ok: false };
    return { ok: true, userId };
  }

  const { data } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return { error: 'Project not found.', ok: false };
  return { ok: true, userId };
}

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'http';
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

export async function listPresentationShares(
  projectId: string
): Promise<{ shares?: PresentationShareRow[]; error?: string }> {
  const owned = await assertOwnsProject(projectId);
  if (!owned.ok) return { error: owned.error };

  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from('presentation_shares')
    .select('id, project_id, token, created_by, created_at, expires_at, revoked_at, label')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  return { shares: (data ?? []) as PresentationShareRow[] };
}

export async function createPresentationShare(
  projectId: string,
  expiry: ShareExpiryOption = '7d'
): Promise<{ url?: string; share?: PresentationShareRow; error?: string }> {
  const owned = await assertOwnsProject(projectId);
  if (!owned.ok) return { error: owned.error };

  const supabase = await createDataClient();
  const token = generateShareToken();
  const expiresAt = expiresAtFromOption(expiry);

  const { data, error } = await supabase
    .from('presentation_shares')
    .insert({
      project_id: projectId,
      token,
      created_by: owned.userId,
      expires_at: expiresAt?.toISOString() ?? null,
    })
    .select('id, project_id, token, created_by, created_at, expires_at, revoked_at, label')
    .single();

  if (error || !data) {
    return { error: error?.message ?? 'Could not create share link.' };
  }

  const origin = await requestOrigin();
  revalidatePath(`/projects/${projectId}`);
  return {
    share: data as PresentationShareRow,
    url: absoluteShareUrl(origin, token),
  };
}

export async function revokePresentationShare(
  projectId: string,
  shareId: string
): Promise<{ error?: string }> {
  const owned = await assertOwnsProject(projectId);
  if (!owned.ok) return { error: owned.error };

  const supabase = await createDataClient();
  const { data, error } = await supabase
    .from('presentation_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', shareId)
    .eq('project_id', projectId)
    .is('revoked_at', null)
    .select('id');

  if (error) return { error: error.message };
  if (!data?.length) return { error: 'Share link not found or already revoked.' };

  revalidatePath(`/projects/${projectId}`);
  return {};
}
