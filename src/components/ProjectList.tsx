'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { deleteProject } from '@/app/actions/projects';

export interface ProjectListItem {
  id: string;
  name: string;
  updated_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ProjectList({ projects }: { projects: ProjectListItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(projects);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(projects);
  }, [projects]);

  async function handleDelete(id: string, name: string) {
    if (
      !window.confirm(
        `Delete “${name}”? This permanently removes all audience data, dealerships, and uploads for this pitch.`
      )
    ) {
      return;
    }

    setDeletingId(id);
    setError(null);
    const result = await deleteProject(id);
    if (result.error) {
      setError(result.error);
      setDeletingId(null);
      return;
    }

    setItems(prev => prev.filter(p => p.id !== id));
    router.refresh();
    setDeletingId(null);
  }

  return (
    <>
      {error && <div className="mom-alert mt-4 p-3 text-sm">{error}</div>}
      <ul className="mt-8 mom-card overflow-hidden divide-y divide-[var(--line)]">
        {items.map(p => (
          <li key={p.id} className="flex items-stretch">
            <Link
              href={`/projects/${p.id}`}
              className="group flex flex-1 min-w-0 items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[var(--surface-2)]"
            >
              <span className="text-sm font-medium text-[var(--ink)] truncate">{p.name}</span>
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
            <button
              type="button"
              onClick={() => handleDelete(p.id, p.name)}
              disabled={deletingId === p.id}
              className="shrink-0 border-l border-[var(--line)] px-4 text-xs font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--alert-text)] disabled:opacity-50"
              title={`Delete ${p.name}`}
            >
              {deletingId === p.id ? 'Deleting…' : 'Delete'}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
