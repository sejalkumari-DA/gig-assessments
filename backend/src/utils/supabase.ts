import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

const stagingUrl = process.env.STAGING_SUPABASE_URL || '';
const stagingKey = process.env.STAGING_SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Warning: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables.');
}

// Global default client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Dynamic client generator
export const getSupabaseClient = (environment?: string) => {
  if (environment === 'staging' || environment === 'production') {
    if (!stagingUrl || !stagingKey) {
      console.warn(`Warning: Missing STAGING credentials, falling back to default db.`);
      return supabase;
    }
    return createClient(stagingUrl, stagingKey);
  }
  return supabase;
};
