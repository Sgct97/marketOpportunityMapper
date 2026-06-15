import Link from 'next/link';
import { createDataClient } from '@/lib/supabase/data';
import { isAuthDisabled } from '@/lib/auth-config';
import { CreateProjectForm } from '@/components/CreateProjectForm';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function HomePage() {
  const supabase = await createDataClient();
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, updated_at')
    .order('updated_at', { ascending: false });

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <header className="bg-white border-b border-[#E2E8F0] px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[#1A202C]">Market Opportunity Mapper</h1>
        {isAuthDisabled() && (
          <span className="text-xs text-[#A0AEC0]">Auth off (local dev)</span>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <h2 className="text-sm font-medium text-[#4BA5A5]">Projects</h2>
        <p className="text-sm text-[#718096] mt-1">
          One project per pitch or market (e.g. client + region).
        </p>

        <CreateProjectForm />

        {error && (
          <div className="mt-6 p-4 bg-[#FFF5F5] border border-[#FEB2B2] text-sm text-[#C53030]">
            {error.message}
          </div>
        )}

        {!error && (!projects || projects.length === 0) && (
          <p className="mt-8 text-sm text-[#718096]">No projects yet — create one above.</p>
        )}

        {!error && projects && projects.length > 0 && (
          <ul className="mt-8 divide-y divide-[#E2E8F0] border border-[#E2E8F0] bg-white">
            {projects.map(p => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="flex items-center justify-between px-4 py-4 hover:bg-[#F7FAFC] transition-colors"
                >
                  <span className="text-sm font-medium text-[#2D3748]">{p.name}</span>
                  <span className="text-xs text-[#A0AEC0]">Updated {formatDate(p.updated_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
