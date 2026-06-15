import type { CompetitorCandidate } from './types';

/** Dedupe by normalized name + proximity (~0.2 mi). */
export function dedupeCompetitors(candidates: CompetitorCandidate[]): CompetitorCandidate[] {
  const kept: CompetitorCandidate[] = [];

  for (const candidate of candidates) {
    const nameKey = candidate.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const duplicate = kept.find(existing => {
      const existingKey = existing.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (nameKey !== existingKey) return false;
      return Math.abs(existing.distanceMiles - candidate.distanceMiles) < 0.2;
    });
    if (!duplicate) kept.push(candidate);
  }

  return kept;
}
