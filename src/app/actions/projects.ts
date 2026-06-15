'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
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
