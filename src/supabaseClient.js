import { createClient } from '@supabase/supabase-js';

// Retrieve credentials from Vite env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if credentials are valid and not placeholders
export const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseUrl !== 'your_supabase_project_url' && 
  supabaseAnonKey && 
  supabaseAnonKey !== 'your_supabase_anon_key';

// Initialize client (or null if not configured yet)
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Helper to get configuration status or get client with local overrides
export const getSupabaseClient = () => {
  // Check if we have dynamic overrides saved in localStorage (useful for quick testing without rebuilding)
  const localUrl = localStorage.getItem('override_supabase_url');
  const localKey = localStorage.getItem('override_supabase_anon_key');
  
  if (localUrl && localKey) {
    try {
      return createClient(localUrl, localKey);
    } catch (e) {
      console.error('Failed to create overridden Supabase client:', e);
    }
  }
  
  return supabase;
};

export const hasAnySupabaseConfig = () => {
  if (isSupabaseConfigured) return true;
  const localUrl = localStorage.getItem('override_supabase_url');
  const localKey = localStorage.getItem('override_supabase_anon_key');
  return !!(localUrl && localKey);
};
