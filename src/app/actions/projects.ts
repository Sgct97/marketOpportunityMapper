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
  const id = projectId.trim();
  if (!id) return { error: 'Invalid project.' };

  const supabase = await createDataClient();
  const authOff = isAuthDisabled();

  const { data: uploads } = await supabase
    .from('uploads')
    .select('storage_path')
    .eq('project_id', id);

  let deleted: { id: string }[] | null = null;
  let deleteError: { message: string } | null = null;

  if (authOff) {
    const result = await supabase.from('projects').delete().eq('id', id).select('id');
    deleted = result.data;
    deleteError = result.error;
  } else {
    const userId = await getActingUserId(supabase);
    if (!userId) {
      return { error: 'Could not verify your account.' };
    }
    const result = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');
    deleted = result.data;
    deleteError = result.error;
  }

  if (deleteError) {
    return { error: deleteError.message };
  }
  if (!deleted?.length) {
    return { error: 'Project not found. Refresh the page and try again.' };
  }

  const paths = uploads?.map(row => row.storage_path).filter(Boolean) ?? [];
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from('uploads').remove(paths);
    if (storageError) {
      console.error('[deleteProject] storage cleanup:', storageError.message);
    }
  }

  revalidatePath('/', 'page');
  return {};
}
