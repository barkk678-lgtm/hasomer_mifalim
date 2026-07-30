'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabaseClient';

const inputStyle = { padding: 10, fontSize: 16, border: '1px solid #ccc', borderRadius: 6 };
const buttonStyle = { padding: 10, fontSize: 16, borderRadius: 6, background: '#2E4A2A', color: '#fff', border: 'none', cursor: 'pointer' };

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | error
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    const supabase = createClient();
    const { error } =
      mode === 'signup'
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 420, margin: '80px auto', padding: 24, fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: 16 }}>{mode === 'signup' ? 'הרשמה למערכת ניהול המפעלים' : 'התחברות למערכת ניהול המפעלים'}</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="האימייל שלך" style={inputStyle} />
        <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="סיסמה (לפחות 6 תווים)" style={inputStyle} />
        <button type="submit" disabled={status === 'loading'} style={buttonStyle}>
          {status === 'loading' ? 'רגע...' : mode === 'signup' ? 'הרשמה' : 'התחברות'}
        </button>
        {status === 'error' && <p style={{ color: 'crimson' }}>{errorMsg}</p>}
      </form>
      <button
        onClick={() => { setMode(m => (m === 'signup' ? 'signin' : 'signup')); setStatus('idle'); setErrorMsg(''); }}
        style={{ marginTop: 16, background: 'none', border: 'none', color: '#2258C9', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
      >
        {mode === 'signup' ? 'כבר יש לך חשבון? התחברות' : 'אין לך חשבון? הרשמה'}
      </button>
    </main>
  );
}
