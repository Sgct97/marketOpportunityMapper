import { createDataClient } from '@/lib/supabase/data';
import { isAuthDisabled } from '@/lib/auth-config';
import { CreateProjectForm } from '@/components/CreateProjectForm';
import { ProjectList } from '@/components/ProjectList';
import { PageChrome } from '@/components/PageChrome';

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

        {!error && projects && projects.length > 0 && <ProjectList projects={projects} />}
      </main>
    </PageChrome>
  );
}
