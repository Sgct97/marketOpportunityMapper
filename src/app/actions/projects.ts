'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isAuthDisabled } from '@/lib/auth-config';
import { createDataClient, getActingUserId } from '@/lib/supabase/data';

export async function createProject(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) {
    return { error: 'Project name is required' };
  }

  const supabase = await createDataClient();
  const userId = await getActingUserId(supabase);
  if (!userId) {
    return {
      error:
        'Could not resolve dev user. Check SUPABASE_SERVICE_ROLE_KEY in .env.local.',
    };
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({ name, user_id: userId })
    .select('id')
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/');
  redirect(`/projects/${data.id}`);
}

export async function renameProject(projectId: string, formData: FormData): Promise<void> {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return;

  const supabase = await createDataClient();
  const { error } = await supabase
    .from('projects')
    .update({ name })
    .eq('id', projectId);

  if (error) {
    console.error('[renameProject]', error.message);
    return;
  }

  revalidatePath('/');
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProject(projectId: string): Promise<{ error?: string }> {
  const supabase = await createDataClient();
  const authOff = isAuthDisabled();
  const userId = authOff ? null : await getActingUserId(supabase);

  if (!authOff && !userId) {
    return { error: 'Could not verify your account.' };
  }

  let existsQuery = supabase.from('projects').select('id').eq('id', projectId);
  if (userId) existsQuery = existsQuery.eq('user_id', userId);

  const { data: project } = await existsQuery.maybeSingle();
  if (!project) {
    return { error: 'Project not found.' };
  }

  const { data: uploads } = await supabase
    .from('uploads')
    .select('storage_path')
    .eq('project_id', projectId);

  let deleteQuery = supabase.from('projects').delete().eq('id', projectId);
  if (userId) deleteQuery = deleteQuery.eq('user_id', userId);

  const { error } = await deleteQuery;
  if (error) {
    return { error: error.message };
  }

  const paths = uploads?.map(row => row.storage_path).filter(Boolean) ?? [];
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from('uploads').remove(paths);
    if (storageError) {
      console.error('[deleteProject] storage cleanup:', storageError.message);
    }
  }

  revalidatePath('/');
  return {};
}
