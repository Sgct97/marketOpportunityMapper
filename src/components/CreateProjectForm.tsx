'use client';

import { useState } from 'react';
import { createProject } from '@/app/actions/projects';

export function CreateProjectForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createProject(formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="mt-6 flex flex-col sm:flex-row gap-3">
      <input
        name="name"
        type="text"
        required
        placeholder="e.g. DFW Hyundai — Q2 pitch"
        className="flex-1 border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:border-[#4BA5A5]"
        disabled={pending}
      />
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 text-sm font-medium text-white bg-[#4BA5A5] hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
      >
        {pending ? 'Creating…' : 'New project'}
      </button>
      {error && <p className="text-sm text-[#C53030] sm:basis-full">{error}</p>}
    </form>
  );
}
