'use server';

import { revalidatePath } from 'next/cache';
import { inferClientFromAudienceFilename, normalizeWebsiteUrl } from '@/lib/dealership/infer-client';
import { resolveClientDealer } from '@/lib/geocode/google-places';
import type { GeocodedPlace } from '@/lib/geocode/types';
import { ensureActiveDealershipDataset } from '@/lib/projects/dealership-dataset';
import { parseProjectMapSettings } from '@/lib/projects/settings';
import { saveProjectMapSettings } from '@/app/actions/project-settings';
import { createDataClient } from '@/lib/supabase/data';

export async function lookupClientDealer(
  projectId: string,
  options: { suggestedName: string; website?: string }
) {
  const suggestedName = options.suggestedName.trim();
  if (!suggestedName) {
    return { error: 'Dealer name is required' };
  }

  const websiteRaw = options.website?.trim() ?? '';
  const website = websiteRaw ? normalizeWebsiteUrl(websiteRaw) : null;
  if (websiteRaw && !website) {
    return { error: 'Enter a valid dealer website URL, or leave it blank to search by name only.' };
  }

  try {
    const { matches, preferred } = await resolveClientDealer({
      suggestedName,
      website,
    });

    if (matches.length === 0) {
      return {
        error: website
          ? 'No matching dealership found. Check the name and website.'
          : 'No matching dealership found. Try adding the dealer website to narrow results.',
      };
    }

    await saveProjectMapSettings(projectId, {
      ...(website ? { clientDealerWebsite: website } : {}),
      suggestedDealerName: suggestedName,
    });

    return {
      success: true,
      matches,
      preferred,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Lookup failed' };
  }
}

export async function confirmClientDealer(
  projectId: string,
  place: GeocodedPlace,
  brand: string
) {
  const supabase = await createDataClient();

  try {
    const datasetId = await ensureActiveDealershipDataset(supabase, projectId);

    await supabase
      .from('dealerships')
      .delete()
      .eq('dataset_id', datasetId)
      .eq('role', 'client');

    const { data: inserted, error } = await supabase
      .from('dealerships')
      .insert({
        dataset_id: datasetId,
        name: place.name,
        brand,
        role: 'client',
        latitude: place.latitude,
        longitude: place.longitude,
        address: place.address,
        geocode_status: 'ok',
        source: 'api',
      })
      .select('id')
      .single();

    if (error || !inserted) {
      return { error: error?.message ?? 'Failed to save client dealership' };
    }

    await saveProjectMapSettings(projectId, {
      focusDealershipId: inserted.id,
      competitorBrand: brand,
      clientDealerWebsite: place.website ?? undefined,
      suggestedDealerName: place.name,
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/map`);
    return { success: true, dealershipId: inserted.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Confirm failed' };
  }
}

export async function getSuggestedClientFromProject(projectId: string) {
  const supabase = await createDataClient();

  const { data: project } = await supabase
    .from('projects')
    .select('settings')
    .eq('id', projectId)
    .single();

  const settings = parseProjectMapSettings(project?.settings);

  const { data: audience } = await supabase
    .from('audience_datasets')
    .select('label, upload:uploads(file_name)')
    .eq('project_id', projectId)
    .eq('is_active', true)
    .maybeSingle();

  const fileName =
    (Array.isArray(audience?.upload) ? audience.upload[0] : audience?.upload)?.file_name ??
    audience?.label ??
    '';

  const inferred = fileName ? inferClientFromAudienceFilename(fileName) : null;

  return {
    suggestedName: settings.suggestedDealerName ?? inferred?.suggestedName ?? '',
    brand: settings.competitorBrand ?? inferred?.brand ?? null,
    website: settings.clientDealerWebsite ?? '',
    fileName,
  };
}
