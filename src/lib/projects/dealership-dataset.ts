import type { SupabaseClient } from '@supabase/supabase-js';

const MAP_DATASET_LABEL = 'Map dealerships';

/** Ensures an active dealership dataset exists for API-sourced map pins. */
export async function ensureActiveDealershipDataset(
  supabase: SupabaseClient,
  projectId: string
): Promise<string> {
  const { data: existing } = await supabase
    .from('dealership_datasets')
    .select('id')
    .eq('project_id', projectId)
    .eq('is_active', true)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase
    .from('dealership_datasets')
    .insert({
      project_id: projectId,
      label: MAP_DATASET_LABEL,
      is_active: true,
    })
    .select('id')
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? 'Failed to create dealership dataset');
  }

  return created.id;
}
