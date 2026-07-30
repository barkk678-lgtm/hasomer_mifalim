'use client';
import { createClient } from '../../lib/supabaseClient';

// This REPLACES the fake "האימייל שלך" text field in TopNav. There, anyone could type any
// email and pretend to be that user. Here, the email comes from a real, verified Google login —
// nobody can type in someone else's identity.
export default function LoginPage() {
  const supabase = createClient();

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div dir="rtl" style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#EEEEE4', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center', border: '1px solid #DAD8C7' }}>
        <h1 style={{ marginBottom: 24, color: '#1E331B' }}>נוער השומר — מערכת ניהול מפעלים</h1>
        <button
          onClick={handleGoogleLogin}
          style={{ padding: '12px 24px', borderRadius: 8, background: '#2E4A2A', color: '#fff', border: 'none', fontSize: 16, cursor: 'pointer' }}
        >
          התחברות עם Google
        </button>
      </div>
    </div>
  );
}
