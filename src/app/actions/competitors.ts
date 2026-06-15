'use server';

import { revalidatePath } from 'next/cache';
import { dedupeCompetitors } from '@/lib/geocode/dedupe';
import { searchCompetitorDealers } from '@/lib/geocode/google-places';
import type { CompetitorCandidate } from '@/lib/geocode/types';
import { isDuplicateOfClient } from '@/lib/dealership/filter';
import type { DealershipRow } from '@/lib/dealership/types';
import { ensureActiveDealershipDataset } from '@/lib/projects/dealership-dataset';
import { parseProjectMapSettings, type RadiusMiles } from '@/lib/projects/settings';
import { createDataClient } from '@/lib/supabase/data';

export async function searchProjectCompetitors(
  projectId: string,
  options: { brand: string; radiusMiles: RadiusMiles }
) {
  const supabase = await createDataClient();
  const settings = parseProjectMapSettings(
    (
      await supabase.from('projects').select('settings').eq('id', projectId).single()
    ).data?.settings
  );

  const focusId = settings.focusDealershipId;
  if (!focusId) {
    return { error: 'Confirm the client dealership before searching competitors.' };
  }

  const { data: client } = await supabase
    .from('dealerships')
    .select('id, name, latitude, longitude, brand, role, address, geocode_status')
    .eq('id', focusId)
    .single();

  if (!client?.latitude || !client?.longitude) {
    return { error: 'Client dealership is missing coordinates.' };
  }

  const brand = options.brand.trim();
  if (!brand) return { error: 'Brand is required for competitor search.' };

  const clientRow = client as DealershipRow;

  try {
    const raw = await searchCompetitorDealers({
      brand,
      latitude: client.latitude,
      longitude: client.longitude,
      radiusMiles: options.radiusMiles,
    });

    const candidates = dedupeCompetitors(raw).filter(
      c =>
        !isDuplicateOfClient(
          {
            id: c.placeId,
            name: c.name,
            brand,
            role: 'competitor',
            latitude: c.latitude,
            longitude: c.longitude,
            address: c.address,
            geocode_status: 'ok',
          },
          clientRow
        )
    );
    return { success: true, candidates };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Competitor search failed' };
  }
}

export async function saveCompetitorSelection(
  projectId: string,
  selected: CompetitorCandidate[],
  brand: string
) {
  const supabase = await createDataClient();

  try {
    const datasetId = await ensureActiveDealershipDataset(supabase, projectId);

    const { data: client } = await supabase
      .from('dealerships')
      .select('id, name, latitude, longitude, brand, role, address, geocode_status')
      .eq('dataset_id', datasetId)
      .eq('role', 'client')
      .maybeSingle();

    const clientRow = (client as DealershipRow | null) ?? null;

    const filtered = selected.filter(
      c =>
        !isDuplicateOfClient(
          {
            id: c.placeId,
            name: c.name,
            brand,
            role: 'competitor',
            latitude: c.latitude,
            longitude: c.longitude,
            address: c.address,
            geocode_status: 'ok',
          },
          clientRow
        )
    );

    await supabase
      .from('dealerships')
      .delete()
      .eq('dataset_id', datasetId)
      .eq('role', 'competitor')
      .eq('source', 'api');

    if (filtered.length > 0) {
      const rows = filtered.map(c => ({
        dataset_id: datasetId,
        name: c.name,
        brand,
        role: 'competitor' as const,
        latitude: c.latitude,
        longitude: c.longitude,
        address: c.address,
        geocode_status: 'ok' as const,
        source: 'api' as const,
      }));

      const { error } = await supabase.from('dealerships').insert(rows);
      if (error) return { error: error.message };
    }

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/map`);
    return { success: true, count: filtered.length };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Save failed' };
  }
}

export async function removeCompetitor(projectId: string, dealershipId: string) {
  const supabase = await createDataClient();

  const { error } = await supabase
    .from('dealerships')
    .delete()
    .eq('id', dealershipId)
    .eq('role', 'competitor');

  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/map`);
  return { success: true };
}
