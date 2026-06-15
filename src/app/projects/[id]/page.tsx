import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSuggestedClientFromProject } from '@/app/actions/client-dealer';
import { renameProject } from '@/app/actions/projects';
import { AudienceUpload } from '@/components/AudienceUpload';
import { AudienceDatasetList } from '@/components/AudienceDatasetList';
import { ClientDealerSetup } from '@/components/ClientDealerSetup';
import { CompetitorReview } from '@/components/CompetitorReview';
import { DealershipUpload } from '@/components/DealershipUpload';
import { DealershipDatasetList } from '@/components/DealershipDatasetList';
import { loadProjectDealerships } from '@/lib/projects/dealership-data';
import { parseProjectMapSettings } from '@/lib/projects/settings';
import { createDataClient } from '@/lib/supabase/data';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createDataClient();

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name, brand_id, updated_at, settings')
    .eq('id', id)
    .single();

  if (error || !project) {
    notFound();
  }

  const settings = parseProjectMapSettings(project.settings);

  const { data: datasets } = await supabase
    .from('audience_datasets')
    .select('id, label, is_active, created_at, upload:uploads(file_name)')
    .eq('project_id', id)
    .order('created_at', { ascending: false });

  const { data: dealershipDatasets } = await supabase
    .from('dealership_datasets')
    .select('id, label, is_active, created_at, upload:uploads(file_name)')
    .eq('project_id', id)
    .order('created_at', { ascending: false });

  const dealershipPayload = await loadProjectDealerships(id);
  const suggested = await getSuggestedClientFromProject(id);

  const clientDealer = dealershipPayload.rows.find(d => d.role === 'client') ?? null;
  const competitors = dealershipPayload.rows.filter(d => d.role === 'competitor');

  const activeAudience = datasets?.find(d => d.is_active);
  const audienceFileName =
    (Array.isArray(activeAudience?.upload)
      ? activeAudience.upload[0]
      : activeAudience?.upload)?.file_name ??
    activeAudience?.label ??
    null;

  const rename = renameProject.bind(null, id);
  const hasAudience = datasets?.some(d => d.is_active);
  const clientReady = Boolean(clientDealer?.latitude && clientDealer?.longitude);

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <header className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <Link href="/" className="text-sm text-[#4BA5A5] hover:underline">
          ← Projects
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <form action={rename} className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <label className="flex-1 w-full text-sm">
            <span className="font-medium text-[#4BA5A5]">Project name</span>
            <input
              name="name"
              defaultValue={project.name}
              className="mt-1 w-full border border-[#E2E8F0] px-3 py-2 text-lg font-semibold text-[#1A202C] focus:outline-none focus:border-[#4BA5A5]"
            />
          </label>
          <button
            type="submit"
            className="px-4 py-2 text-sm border border-[#E2E8F0] text-[#2D3748] hover:bg-white"
          >
            Save name
          </button>
        </form>

        <section className="mt-10 space-y-4">
          <AudienceUpload projectId={id} />
          <AudienceDatasetList
            projectId={id}
            datasets={(datasets ?? []).map(d => ({
              id: d.id,
              label: d.label,
              is_active: d.is_active,
              created_at: d.created_at,
              upload: Array.isArray(d.upload) ? d.upload[0] : d.upload,
            }))}
          />
        </section>

        {hasAudience && (
          <section className="mt-6 space-y-4">
            <ClientDealerSetup
              projectId={id}
              initialName={suggested.suggestedName}
              initialBrand={suggested.brand}
              initialWebsite={suggested.website}
              audienceFileName={audienceFileName}
              confirmedClient={
                clientDealer
                  ? {
                      id: clientDealer.id,
                      name: clientDealer.name,
                      brand: clientDealer.brand,
                      address: clientDealer.address,
                    }
                  : null
              }
            />
            <CompetitorReview
              projectId={id}
              clientConfirmed={Boolean(clientDealer?.latitude && clientDealer?.longitude)}
              initialBrand={clientDealer?.brand ?? suggested.brand ?? ''}
              initialRadiusMiles={settings.radiusMiles ?? 25}
              existingCompetitors={competitors.map(c => ({
                id: c.id,
                name: c.name,
                brand: c.brand,
                address: c.address,
              }))}
            />
          </section>
        )}

        <details className="mt-6">
          <summary className="text-xs text-[#718096] cursor-pointer hover:text-[#4BA5A5]">
            Advanced: upload dealership spreadsheet (optional fallback)
          </summary>
          <section className="mt-4 space-y-4">
            <DealershipUpload projectId={id} />
            <DealershipDatasetList
              projectId={id}
              datasets={(dealershipDatasets ?? []).map(d => ({
                id: d.id,
                label: d.label,
                is_active: d.is_active,
                created_at: d.created_at,
                upload: Array.isArray(d.upload) ? d.upload[0] : d.upload,
              }))}
            />
          </section>
        </details>

        <section className="mt-8 bg-white border border-[#E2E8F0] p-6">
          <h3 className="text-sm font-medium text-[#2D3748]">Market opportunity map</h3>
          <p className="text-xs text-[#718096] mt-1 mb-4">
            {hasAudience
              ? clientReady
                ? 'Present ZIP-level audience with confirmed client dealership and competitors.'
                : 'ZIP heatmap is available now. Confirm the client dealership on setup to show pins and radius analysis.'
              : 'Upload audience data to enable the map.'}
          </p>
          {hasAudience ? (
            <Link
              href={`/projects/${id}/map`}
              className="inline-block px-5 py-2.5 text-sm font-medium text-white bg-[#4BA5A5] hover:opacity-90"
            >
              Open presentation map →
            </Link>
          ) : (
            <span className="text-xs text-[#A0AEC0]">Upload required</span>
          )}
        </section>
      </main>
    </div>
  );
}
