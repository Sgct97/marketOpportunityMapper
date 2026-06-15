import { createDataClient } from '@/lib/supabase/data';
import type { AudienceZipRow } from '@/lib/audience/aggregate';

export interface ProjectAudiencePayload {
  projectId: string;
  projectName: string;
  brandId: string;
  datasetId: string | null;
  datasetLabel: string | null;
  rows: AudienceZipRow[];
}

export async function loadProjectAudience(projectId: string): Promise<ProjectAudiencePayload | null> {
  const supabase = await createDataClient();

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

  const { data: counts } = await supabase
    .from('audience_zip_counts')
    .select('zip, audience_type, audience_count')
    .eq('dataset_id', dataset.id);

  return {
    projectId: project.id,
    projectName: project.name,
    brandId: project.brand_id,
    datasetId: dataset.id,
    datasetLabel: dataset.label,
    rows: (counts ?? []).map(r => ({
      zip: r.zip,
      audience_type: r.audience_type,
      audience_count: r.audience_count,
    })),
  };
}
