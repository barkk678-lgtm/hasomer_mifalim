import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabaseServer';
import TopNav from '../../components/TopNav';
import FinancialsPageView from '../../components/FinancialsPageView';

export default async function FinancialsRoute() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  return (
    <div>
      <TopNav userEmail={user.email} role={profile?.role || '...'} />
      <main className="max-w-7xl mx-auto p-8">
        <FinancialsPageView />
      </main>
    </div>
  );
}
