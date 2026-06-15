'use client';

import { setActiveAudienceDataset } from '@/app/actions/audience';

export interface AudienceDatasetItem {
  id: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
  upload?: { file_name: string } | null;
}

interface Props {
  projectId: string;
  datasets: AudienceDatasetItem[];
}

export function AudienceDatasetList({ projectId, datasets }: Props) {
  if (datasets.length === 0) return null;

  async function handleActivate(datasetId: string) {
    await setActiveAudienceDataset(projectId, datasetId);
  }

  return (
    <div className="mt-4">
      <h4 className="text-xs font-medium text-[#718096] uppercase tracking-wide mb-2">
        Dataset versions
      </h4>
      <ul className="space-y-2">
        {datasets.map(d => (
          <li
            key={d.id}
            className="flex items-center justify-between text-sm border border-[#E2E8F0] px-3 py-2 bg-[#FAFBFC]"
          >
            <span className="text-[#2D3748]">
              {d.label || d.upload?.file_name || 'Untitled'}
              {d.is_active && (
                <span className="ml-2 text-xs text-[#4BA5A5] font-medium">Active</span>
              )}
            </span>
            {!d.is_active && (
              <button
                type="button"
                onClick={() => handleActivate(d.id)}
                className="text-xs text-[#4BA5A5] hover:underline"
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
