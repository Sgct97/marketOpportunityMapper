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
    <form action={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <input
        name="name"
        type="text"
        required
        placeholder="e.g. DFW Hyundai — Q2 pitch"
        className="mom-field flex-1"
        disabled={pending}
      />
      <button type="submit" disabled={pending} className="mom-btn-accent">
        {pending ? 'Creating…' : 'New project'}
      </button>
      {error && <p className="text-sm text-[var(--alert-text)] sm:basis-full">{error}</p>}
    </form>
  );
}
