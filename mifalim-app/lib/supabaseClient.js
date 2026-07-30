// Real Supabase connection — replaces the fake window.storage used inside the chat artifact.
// Every component that needs to read/write data imports `supabase` from this file.
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
