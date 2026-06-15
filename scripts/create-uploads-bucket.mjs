/**
 * Creates the "uploads" storage bucket. Run once:
 *   node scripts/create-uploads-bucket.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env.local');

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error('Missing .env.local');
    process.exit(1);
  }
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existing } = await supabase.storage.listBuckets();
if (existing?.some(b => b.id === 'uploads')) {
  console.log('Bucket "uploads" already exists.');
  process.exit(0);
}

const { data, error } = await supabase.storage.createBucket('uploads', {
  public: false,
});

if (error) {
  console.error('Failed:', error.message);
  process.exit(1);
}

console.log('Created bucket "uploads":', data);
console.log('If uploads still fail, run supabase/migrations/002_storage_bucket.sql in SQL Editor for policies.');
