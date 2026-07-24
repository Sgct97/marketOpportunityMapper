'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  createPresentationShare,
  revokePresentationShare,
} from '@/app/actions/presentation-shares';
import {
  absoluteShareUrl,
  isShareActive,
  type PresentationShareRow,
  type ShareExpiryOption,
} from '@/lib/presentation-shares';

const EXPIRY_OPTIONS: { value: ShareExpiryOption; label: string }[] = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'never', label: 'No expiry' },
];

interface Props {
  projectId: string;
  initialShares: PresentationShareRow[];
  appOrigin: string;
}

function formatWhen(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ShareLinkPanel({ projectId, initialShares, appOrigin }: Props) {
  const [shares, setShares] = useState(initialShares);
  const [expiry, setExpiry] = useState<ShareExpiryOption>('7d');
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeShares = useMemo(
    () => shares.filter(s => isShareActive(s)),
    [shares]
  );

  function shareUrl(token: string) {
    return absoluteShareUrl(appOrigin, token);
  }

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createPresentationShare(projectId, expiry);
      if (result.error || !result.share || !result.url) {
        setError(result.error ?? 'Could not create link.');
        return;
      }
      setShares(prev => [result.share!, ...prev]);
      try {
        await navigator.clipboard.writeText(result.url);
        setCopiedId(result.share.id);
      } catch {
        // Clipboard may be blocked; link still appears in the list.
      }
    });
  }

  function handleCopy(share: PresentationShareRow) {
    const url = shareUrl(share.token);
    startTransition(async () => {
      try {
        await navigator.clipboard.writeText(url);
        setCopiedId(share.id);
      } catch {
        setError('Could not copy to clipboard.');
      }
    });
  }

  function handleRevoke(shareId: string) {
    setError(null);
    startTransition(async () => {
      const result = await revokePresentationShare(projectId, shareId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setShares(prev =>
        prev.map(s =>
          s.id === shareId ? { ...s, revoked_at: new Date().toISOString() } : s
        )
      );
    });
  }

  return (
    <section className="mt-8 mom-card p-6">
      <h3 className="text-sm font-semibold text-[var(--ink)]">Presentation share link</h3>
      <p className="text-xs text-[var(--muted)] mt-1.5 mb-4">
        Anyone with the link can open the map, dashboard, and PDF export for this project — not
        setup, uploads, or your other projects.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
        <label className="flex-1 text-sm">
          <span className="mom-eyebrow">Expires</span>
          <select
            className="mom-field mt-2"
            value={expiry}
            onChange={e => setExpiry(e.target.value as ShareExpiryOption)}
            disabled={pending}
          >
            {EXPIRY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="mom-btn-accent"
          onClick={handleCreate}
          disabled={pending}
        >
          {pending ? 'Working…' : 'Create & copy link'}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-xs text-[var(--alert-text)]" role="alert">
          {error}
        </p>
      )}

      {activeShares.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {activeShares.map(share => (
            <li
              key={share.id}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3"
            >
              <p className="text-[12px] text-[var(--muted)] break-all font-mono">
                {shareUrl(share.token)}
              </p>
              <p className="mt-1.5 text-[11px] text-[var(--faint)]">
                Created {formatWhen(share.created_at)} · Expires {formatWhen(share.expires_at)}
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  className="mom-btn h-8 px-3 text-[12px]"
                  onClick={() => handleCopy(share)}
                  disabled={pending}
                >
                  {copiedId === share.id ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  className="mom-btn h-8 px-3 text-[12px]"
                  onClick={() => handleRevoke(share.id)}
                  disabled={pending}
                >
                  Revoke
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-xs text-[var(--faint)]">No active share links yet.</p>
      )}
    </section>
  );
}
