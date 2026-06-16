'use client';

import { setActiveDealershipDataset } from '@/app/actions/dealership';

export interface DealershipDatasetItem {
  id: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
  upload?: { file_name: string } | null;
}

interface Props {
  projectId: string;
  datasets: DealershipDatasetItem[];
}

export function DealershipDatasetList({ projectId, datasets }: Props) {
  if (datasets.length === 0) return null;

  async function handleActivate(datasetId: string) {
    await setActiveDealershipDataset(projectId, datasetId);
  }

  return (
    <div className="mt-4">
      <h4 className="mom-eyebrow mb-2">Dataset versions</h4>
      <ul className="space-y-2">
        {datasets.map(d => (
          <li
            key={d.id}
            className="mom-inset flex items-center justify-between text-sm px-3 py-2"
          >
            <span className="text-[var(--ink-2)]">
              {d.label || d.upload?.file_name || 'Untitled'}
              {d.is_active && (
                <span className="ml-2 text-xs text-[var(--accent)] font-semibold">Active</span>
              )}
            </span>
            {!d.is_active && (
              <button
                type="button"
                onClick={() => handleActivate(d.id)}
                className="mom-link text-xs"
              >
                Set active
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
