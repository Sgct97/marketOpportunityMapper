'use server';

import { revalidatePath } from 'next/cache';
import { canonicalizeOemBrand } from '@/lib/brands';
import { dedupeCompetitors } from '@/lib/geocode/dedupe';
import { resolveCompetitorSaveBrand } from '@/lib/geocode/filter-competitor-brand';
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

    const normalizedBrand = canonicalizeOemBrand(brand.trim()) ?? brand.trim();
    if (!normalizedBrand) return { error: 'Brand is required.' };

    const filtered = selected
      .map(c => {
        const saveBrand = resolveCompetitorSaveBrand(c.name, brand);
        if (!saveBrand) return null;
        return { candidate: c, saveBrand };
      })
      .filter((row): row is { candidate: CompetitorCandidate; saveBrand: string } => row != null)
      .filter(
        ({ candidate: c, saveBrand }) =>
          !isDuplicateOfClient(
            {
              id: c.placeId,
              name: c.name,
              brand: saveBrand,
              role: 'competitor',
              latitude: c.latitude,
              longitude: c.longitude,
              address: c.address,
              geocode_status: 'ok',
            },
            clientRow
          )
      );

    // Replace competitors for this brand only; keep other brands already on the map.
    await supabase
      .from('dealerships')
      .delete()
      .eq('dataset_id', datasetId)
      .eq('role', 'competitor')
      .eq('source', 'api')
      .ilike('brand', normalizedBrand);

    if (filtered.length > 0) {
      const rows = filtered.map(({ candidate: c, saveBrand }) => ({
        dataset_id: datasetId,
        name: c.name,
        brand: saveBrand,
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
