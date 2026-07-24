import type { SupabaseClient } from '@supabase/supabase-js';
import type { AudienceZipRow } from '@/lib/audience/aggregate';
import { normalizeAudienceType } from '@/lib/audience/validate';
import { createDataClient } from '@/lib/supabase/data';

export interface ProjectAudiencePayload {
  projectId: string;
  projectName: string;
  brandId: string;
  datasetId: string | null;
  datasetLabel: string | null;
  rows: AudienceZipRow[];
}

export async function loadProjectAudience(
  projectId: string,
  client?: SupabaseClient
): Promise<ProjectAudiencePayload | null> {
  const supabase = client ?? (await createDataClient());

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, brand_id')
    .eq('id', projectId)
    .single();

  if (!project) return null;

  const { data: dataset } = await supabase
    .from('audience_datasets')
    .select('id, label')
    .eq('project_id', projectId)
    .eq('is_active', true)
    .maybeSingle();

  if (!dataset) {
    return {
      projectId: project.id,
      projectName: project.name,
      brandId: project.brand_id,
      datasetId: null,
      datasetLabel: null,
      rows: [],
    };
  }

  const rows = await loadAllZipCounts(supabase, dataset.id);

  return {
    projectId: project.id,
    projectName: project.name,
    brandId: project.brand_id,
    datasetId: dataset.id,
    datasetLabel: dataset.label,
    rows,
  };
}

/**
 * Supabase caps a single select at ~1,000 rows. Wide-format audience files
 * easily exceed that (ZIPs × segments), so we page through the full dataset —
 * otherwise totals silently undercount the market.
 */
const ZIP_COUNTS_PAGE_SIZE = 1000;

async function loadAllZipCounts(
  supabase: SupabaseClient,
  datasetId: string
): Promise<AudienceZipRow[]> {
  const rows: AudienceZipRow[] = [];

  for (let from = 0; ; from += ZIP_COUNTS_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('audience_zip_counts')
      .select('zip, audience_type, audience_count')
      .eq('dataset_id', datasetId)
      .order('zip', { ascending: true })
      .order('audience_type', { ascending: true })
      .range(from, from + ZIP_COUNTS_PAGE_SIZE - 1);

    if (error || !data || data.length === 0) break;

    for (const r of data) {
      rows.push({
        zip: r.zip,
        audience_type: normalizeAudienceType(r.audience_type),
        audience_count: r.audience_count,
      });
    }

    if (data.length < ZIP_COUNTS_PAGE_SIZE) break;
  }

  return rows;
}
