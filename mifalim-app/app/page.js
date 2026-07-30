import { redirect } from 'next/navigation';
import { createClient } from '../lib/supabaseServer';
import SignOutButton from '../components/SignOutButton';

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  return (
    <main style={{ maxWidth: 480, margin: '80px auto', padding: 24, fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>מחובר בהצלחה</h1>
      <p>אימייל: {user.email}</p>
      <p>תפקיד: {profile?.role || 'טוען...'}</p>
      <SignOutButton />
      <p style={{ marginTop: 24, color: '#666', fontSize: 14 }}>
        זהו שלב בדיקת ההתחברות בלבד — המסך הראשי של המערכת ייבנה בשלבים הבאים, ישות אחר ישות.
      </p>
    </main>
  );
}
