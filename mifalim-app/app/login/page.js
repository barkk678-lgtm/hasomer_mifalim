'use client';
import { useState } from 'react';
import { createClient } from '../../lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
    } else {
      setStatus('sent');
    }
  }

  if (status === 'sent') {
    return (
      <main style={{ maxWidth: 420, margin: '80px auto', padding: 24, fontFamily: 'sans-serif', textAlign: 'center' }}>
        <h1>נשלח קישור התחברות</h1>
        <p>בדקו את תיבת המייל שלכם ({email}) ולחצו על הקישור כדי להתחבר.</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 420, margin: '80px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: 16 }}>התחברות למערכת ניהול המפעלים</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="האימייל שלך"
          style={{ padding: 10, fontSize: 16, border: '1px solid #ccc', borderRadius: 6 }}
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          style={{ padding: 10, fontSize: 16, borderRadius: 6, background: '#2E4A2A', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          {status === 'sending' ? 'שולח...' : 'שליחת קישור התחברות'}
        </button>
        {status === 'error' && <p style={{ color: 'crimson' }}>{errorMsg}</p>}
      </form>
    </main>
  );
}
