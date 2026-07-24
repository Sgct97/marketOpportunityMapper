import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadProjectAudience } from '@/lib/projects/audience-data';
import { loadProjectDealerships } from '@/lib/projects/dealership-data';
import { parseProjectMapSettings } from '@/lib/projects/settings';
import { createDataClient } from '@/lib/supabase/data';
import { PresentationWorkspace } from '@/components/presentation/PresentationWorkspace';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectMapPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createDataClient();

  const { data: project } = await supabase
    .from('projects')
    .select('settings')
    .eq('id', id)
    .single();

  const payload = await loadProjectAudience(id);
  if (!payload) {
    notFound();
  }

  if (!payload.datasetId || payload.rows.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAFBFC] flex flex-col items-center justify-center px-6">
        <div className="max-w-md text-center bg-white border border-[#E2E8F0] p-10">
          <h1 className="text-lg font-semibold text-[#1A202C]">No audience data</h1>
          <p className="text-sm text-[#718096] mt-2">
            Upload an audience file on the project setup page before opening the map.
          </p>
          <Link
            href={`/projects/${id}`}
            className="inline-block mt-6 text-sm font-medium text-[var(--accent,#003c46)] hover:underline"
          >
            ← Back to project setup
          </Link>
        </div>
      </div>
    );
  }

  const dealershipPayload = await loadProjectDealerships(id);

  return (
    <PresentationWorkspace
      projectId={payload.projectId}
      projectName={payload.projectName}
      brandId={payload.brandId}
      datasetLabel={payload.datasetLabel}
      rows={payload.rows}
      dealerships={dealershipPayload.rows}
      initialSettings={parseProjectMapSettings(project?.settings)}
    />
  );
}
