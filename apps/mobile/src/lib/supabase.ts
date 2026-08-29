import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const envAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Fall back to a syntactically valid placeholder so createClient() never throws
// and crashes the whole app before a real Supabase project exists yet (Phase 1).
// Auth/data calls will simply fail against this placeholder until real values are set.
const supabaseUrl = envUrl || 'https://placeholder.supabase.co';
const supabaseAnonKey = envAnonKey || 'placeholder-anon-key';

if (!envUrl || !envAnonKey) {
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are not set. ' +
      'Copy .env.example to .env and fill in your Supabase project values. ' +
      'Auth and data screens will not work until you do.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
