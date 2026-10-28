import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { authStorage } from './storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kqxhwyjbuwacsgykxqid.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxeGh3eWpidXdhY3NneWt4cWlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NjM4MTksImV4cCI6MjA5NTEzOTgxOX0.EEI5uoe7K9I7FG30c95JzTt1hqNbAYOUMbDv2LAvJQ0';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
