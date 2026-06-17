import Link from 'next/link';
import { createDataClient } from '@/lib/supabase/data';
import { isAuthDisabled } from '@/lib/auth-config';
import { CreateProjectForm } from '@/components/CreateProjectForm';
import { PageChrome } from '@/components/PageChrome';

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
    <PageChrome
      title="Market Opportunity Mapper"
      note={isAuthDisabled() ? 'Auth off' : undefined}
    >
      <main className="max-w-4xl mx-auto px-6 py-10 mom-fade-up">
        <p className="mom-eyebrow">Projects</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--ink)]">
          Your market pitches
        </h2>
        <p className="text-sm text-[var(--muted)] mt-1.5">
          One project per pitch or market (e.g. client + region).
        </p>

        <div className="mom-card p-5 mt-6">
          <CreateProjectForm />
        </div>

        {error && (
          <div className="mom-alert mt-6 p-4 text-sm">{error.message}</div>
        )}

        {!error && (!projects || projects.length === 0) && (
          <div className="mom-card mt-8 p-10 text-center">
            <p className="text-sm text-[var(--muted)]">
              No projects yet — create one above.
            </p>
          </div>
        )}

        {!error && projects && projects.length > 0 && (
          <ul className="mt-8 mom-card overflow-hidden divide-y divide-[var(--line)]">
            {projects.map(p => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[var(--surface-2)]"
                >
                  <span className="text-sm font-medium text-[var(--ink)] truncate">
                    {p.name}
                  </span>
                  <span className="flex items-center gap-2 shrink-0 text-xs text-[var(--faint)]">
                    Updated {formatDate(p.updated_at)}
                    <span
                      aria-hidden
                      className="text-[var(--accent)] opacity-0 -translate-x-1 transition group-hover:opacity-100 group-hover:translate-x-0"
                    >
                      →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </PageChrome>
  );
}
