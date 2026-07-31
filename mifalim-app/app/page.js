import { redirect } from 'next/navigation';
import { createClient } from '../lib/supabaseServer';
import SignOutButton from '../components/SignOutButton';
import MifalimList from '../components/MifalimList';
import { C } from '../lib/designSystem';

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  return (
    <div>
      <div className="sticky top-0 z-30 w-full" style={{ background: C.forest }}>
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between flex-wrap gap-3">
          <span className="text-white font-bold text-base" style={{ fontFamily: 'Rubik, sans-serif' }}>נוער השומר — ניהול מפעלים</span>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: '#E4E7DC' }}>{user.email} · {profile?.role || '...'}</span>
            <SignOutButton />
          </div>
        </div>
      </div>
      <main className="max-w-5xl mx-auto p-8">
        <MifalimList />
      </main>
    </div>
  );
}
