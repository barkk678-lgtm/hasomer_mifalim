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
      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
      style={{ background: '#1E331B', color: '#fff', border: '1px solid #4C6B45' }}
    >
      התנתקות
    </button>
  );
}
