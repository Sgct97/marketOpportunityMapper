import type { SupabaseClient } from '@supabase/supabase-js';
import { createDataClient } from '@/lib/supabase/data';
import type { DealershipRow } from '@/lib/dealership/types';

export interface ProjectDealershipPayload {
  datasetId: string | null;
  datasetLabel: string | null;
  rows: DealershipRow[];
}

export async function loadProjectDealerships(
  projectId: string,
  client?: SupabaseClient
): Promise<ProjectDealershipPayload> {
  const supabase = client ?? (await createDataClient());

  const { data: dataset } = await supabase
    .from('dealership_datasets')
    .select('id, label')
    .eq('project_id', projectId)
    .eq('is_active', true)
    .maybeSingle();

  if (!dataset) {
    return { datasetId: null, datasetLabel: null, rows: [] };
  }

  const { data: dealers } = await supabase
    .from('dealerships')
    .select('id, name, brand, role, latitude, longitude, address, geocode_status')
    .eq('dataset_id', dataset.id)
    .order('name');

  return {
    datasetId: dataset.id,
    datasetLabel: dataset.label,
    rows: (dealers ?? []) as DealershipRow[],
  };
}
