'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabaseClient';
import { C } from '../../lib/designSystem';

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
      setErrorMsg(
        mode === 'signin' && error.message.toLowerCase().includes('invalid login credentials')
          ? 'המייל או הסיסמה שגויים — או שעדיין אין לך חשבון. לחצו למטה על "אין לך חשבון? הרשמה".'
          : error.message
      );
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.paper }}>
      <div className="w-full max-w-sm rounded-2xl p-8" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <h1 className="text-lg font-bold mb-6 text-center" style={{ fontFamily: 'Rubik, sans-serif', color: C.forestDark }}>
          {mode === 'signup' ? 'הרשמה למערכת ניהול המפעלים' : 'התחברות למערכת ניהול המפעלים'}
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="האימייל שלך"
            className="w-full rounded-md px-3 py-2 text-sm outline-none"
            style={{ background: C.surface, border: `1px solid ${C.line}`, color: C.ink }}
          />
          <input
            type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="סיסמה (לפחות 8 תווים)"
            className="w-full rounded-md px-3 py-2 text-sm outline-none"
            style={{ background: C.surface, border: `1px solid ${C.line}`, color: C.ink }}
          />
          <button type="submit" disabled={status === 'loading'} className="rounded-md px-3 py-2.5 text-sm font-semibold text-white" style={{ background: C.forest, opacity: status === 'loading' ? 0.6 : 1 }}>
            {status === 'loading' ? 'רגע...' : mode === 'signup' ? 'הרשמה' : 'התחברות'}
          </button>
          {status === 'error' && <p className="text-xs" style={{ color: C.rust }}>{errorMsg}</p>}
        </form>
        <button
          onClick={() => { setMode(m => (m === 'signup' ? 'signin' : 'signup')); setStatus('idle'); setErrorMsg(''); }}
          className="mt-4 text-xs font-semibold underline block mx-auto"
          style={{ color: C.linkBlue }}
        >
          {mode === 'signup' ? 'כבר יש לך חשבון? התחברות' : 'אין לך חשבון? הרשמה'}
        </button>
      </div>
    </div>
  );
}
