import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// Make sure to replace these with your actual Supabase URL and Anon Key.
// You can find these in your Supabase project dashboard under Project Settings -> API.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kchpmzfjmwpfyhfckacu.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_9ezo2e99lvg38HlktENh-Q_oecIJfAt';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
 