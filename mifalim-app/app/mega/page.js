import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabaseServer';
import TopNav from '../../components/TopNav';
import MegaProjectsPage from '../../components/MegaProjectsPage';

export default async function MegaRoute() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  return (
    <div>
      <TopNav userEmail={user.email} role={profile?.role || '...'} />
      <main className="max-w-7xl mx-auto p-8">
        <MegaProjectsPage />
      </main>
    </div>
  );
}
