import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabaseServer';
import TopNav from '../../../components/TopNav';
import MifalDetailView from '../../../components/MifalDetailView';

export default async function MifalDetailRoute({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  return (
    <div>
      <TopNav userEmail={user.email} role={profile?.role || '...'} />
      <main className="max-w-5xl mx-auto p-8">
        <MifalDetailView mifalId={params.id} />
      </main>
    </div>
  );
}
