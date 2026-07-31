import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabaseServer';

// Handles magic-link confirmation via token_hash — unlike the PKCE `code` flow in
// /auth/callback, this does NOT require the click to happen in the same browser/device
// that requested the link (no matching cookie needed), so it works when someone opens
// the email on their phone after requesting the link on desktop.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') || '/';

  if (token_hash && type) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) redirect(next);
  }

  redirect('/login?error=auth');
}
