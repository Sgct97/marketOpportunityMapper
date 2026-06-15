'use server';

import { revalidatePath } from 'next/cache';
import {
  parseProjectMapSettings,
  type ProjectMapSettings,
} from '@/lib/projects/settings';
import { createDataClient } from '@/lib/supabase/data';

export async function saveProjectMapSettings(
  projectId: string,
  patch: Partial<ProjectMapSettings>
) {
  const supabase = await createDataClient();

  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('settings')
    .eq('id', projectId)
    .single();

  if (fetchError || !project) {
    return { error: fetchError?.message ?? 'Project not found' };
  }

  const current = parseProjectMapSettings(project.settings);
  const settings = { ...current, ...patch };

  const { error } = await supabase
    .from('projects')
    .update({ settings })
    .eq('id', projectId);

  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}/map`);
  return { success: true };
}
