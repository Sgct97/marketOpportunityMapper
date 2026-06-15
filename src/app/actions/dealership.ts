'use server';

import { revalidatePath } from 'next/cache';
import { validateDealershipRows } from '@/lib/dealership/validate';
import { parseSpreadsheetBuffer } from '@/lib/parsers/spreadsheet';
import { createDataClient } from '@/lib/supabase/data';

const BATCH_SIZE = 500;

export async function uploadDealershipFile(projectId: string, formData: FormData) {
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { error: 'No file provided' };
  }

  const fileName = file.name;
  const lower = fileName.toLowerCase();
  if (!lower.endsWith('.csv') && !lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
    return { error: 'Use a .csv or .xlsx file' };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let rawRows: Record<string, string>[];

  try {
    rawRows = parseSpreadsheetBuffer(buffer, fileName);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to parse file' };
  }

  const { records, summary } = validateDealershipRows(rawRows, fileName);
  if (records.length === 0) {
    return { error: summary.invalid[0]?.reason ?? 'No valid rows to import', summary };
  }

  const supabase = await createDataClient();
  const uploadId = crypto.randomUUID();
  const storagePath = `${projectId}/dealership/${uploadId}-${fileName}`;

  const { error: storageError } = await supabase.storage
    .from('uploads')
    .upload(storagePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (storageError) {
    return {
      error: `Storage upload failed: ${storageError.message}. Create the "uploads" bucket in Supabase (see docs/SUPABASE_SETUP.md).`,
    };
  }

  const { data: uploadRow, error: uploadMetaError } = await supabase
    .from('uploads')
    .insert({
      id: uploadId,
      project_id: projectId,
      kind: 'dealership',
      file_name: fileName,
      storage_path: storagePath,
      row_count: summary.rowsProcessed,
      imported_count: summary.rowsImported,
      skipped_count: summary.invalidRows,
      summary,
    })
    .select('id')
    .single();

  if (uploadMetaError || !uploadRow) {
    return { error: uploadMetaError?.message ?? 'Failed to save upload metadata' };
  }

  await supabase
    .from('dealership_datasets')
    .update({ is_active: false })
    .eq('project_id', projectId);

  const label = fileName.replace(/\.(csv|xlsx|xls)$/i, '');
  const { data: dataset, error: datasetError } = await supabase
    .from('dealership_datasets')
    .insert({
      project_id: projectId,
      upload_id: uploadRow.id,
      label,
      is_active: true,
    })
    .select('id')
    .single();

  if (datasetError || !dataset) {
    return { error: datasetError?.message ?? 'Failed to create dataset' };
  }

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE).map(r => ({
      dataset_id: dataset.id,
      name: r.name,
      brand: r.brand,
      role: r.role,
      latitude: r.latitude,
      longitude: r.longitude,
      address: r.address,
      geocode_status: r.geocodeStatus,
      source: 'upload' as const,
    }));

    const { error: batchError } = await supabase.from('dealerships').insert(batch);
    if (batchError) {
      return { error: batchError.message };
    }
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/map`);
  return { success: true, summary };
}

export async function setActiveDealershipDataset(projectId: string, datasetId: string) {
  const supabase = await createDataClient();

  await supabase
    .from('dealership_datasets')
    .update({ is_active: false })
    .eq('project_id', projectId);

  const { error } = await supabase
    .from('dealership_datasets')
    .update({ is_active: true })
    .eq('id', datasetId)
    .eq('project_id', projectId);

  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/map`);
  return { success: true };
}
