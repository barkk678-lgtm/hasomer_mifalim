'use client';
import { createClient } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      style={{ padding: '8px 16px', marginTop: 16, borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}
    >
      התנתקות
    </button>
  );
}
