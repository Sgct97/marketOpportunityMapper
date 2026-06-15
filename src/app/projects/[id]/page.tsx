import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createDataClient } from '@/lib/supabase/data';
import { renameProject } from '@/app/actions/projects';
import { AudienceUpload } from '@/components/AudienceUpload';
import { AudienceDatasetList } from '@/components/AudienceDatasetList';
import { DealershipUpload } from '@/components/DealershipUpload';
import { DealershipDatasetList } from '@/components/DealershipDatasetList';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createDataClient();

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name, brand_id, updated_at')
    .eq('id', id)
    .single();

  if (error || !project) {
    notFound();
  }

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

  const rename = renameProject.bind(null, id);

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

        <section className="mt-6 space-y-4">
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

        <section className="mt-8 bg-white border border-[#E2E8F0] p-6">
          <h3 className="text-sm font-medium text-[#2D3748]">Market opportunity map</h3>
          <p className="text-xs text-[#718096] mt-1 mb-4">
            {datasets?.some(d => d.is_active)
              ? 'Present ZIP-level audience density with dealership overlays and radius analysis.'
              : 'Upload audience data to enable the map.'}
          </p>
          {datasets?.some(d => d.is_active) ? (
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
