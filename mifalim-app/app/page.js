import { redirect } from 'next/navigation';
import { createClient } from '../lib/supabaseServer';
import SignOutButton from '../components/SignOutButton';
import MifalimList from '../components/MifalimList';

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>נוער השומר — ניהול מפעלים</h1>
          <p style={{ color: '#666', margin: 0 }}>מחובר בתור {user.email} · תפקיד: {profile?.role || 'טוען...'}</p>
        </div>
        <SignOutButton />
      </div>

      <MifalimList />
    </main>
  );
}
