'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from './supabaseClient';

export function useMifal(id) {
  const supabase = createClient();
  const [mifal, setMifal] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase.from('mifalim').select('*').eq('id', id).single();
    if (error) console.error('שגיאה בטעינת מפעל:', error);
    setMifal(data || null);
    setLoading(false);
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  async function updateMifal(patch) {
    const { participants, balance, ...cleanPatch } = patch;
    const { data, error } = await supabase.from('mifalim').update(cleanPatch).eq('id', id).select().single();
    if (error) { console.error('שגיאה בעדכון מפעל:', error); return null; }
    setMifal(data);
    return data;
  }

  async function deleteMifal() {
    const { error } = await supabase.from('mifalim').delete().eq('id', id);
    if (error) { console.error('שגיאה במחיקת מפעל:', error); return false; }
    return true;
  }

  // Atomically computes the mifal's actual balance and records it into petty cash — see
  // transfer_mifal_balance() in supabase/schema/09_petty_cash_management.sql. admin/super_admin
  // only (enforced in the function itself); raises if the mifal was already transferred.
  async function transferBalance(note) {
    const { data, error } = await supabase.rpc('transfer_mifal_balance', { p_mifal_id: id, p_note: note || null });
    if (error) { console.error('שגיאה בהעברת יתרת המפעל:', error); return { error: error.message }; }
    await reload();
    return { balance: data, error: null };
  }

  // Deletes the mifal's recorded balance transfer(s) and unlocks the budget for editing again —
  // see reopen_mifal_balance() in supabase/schema/09_petty_cash_management.sql. admin/super_admin
  // only. Re-closing afterward recomputes the full balance fresh (not a delta correction).
  async function reopenBalance() {
    const { error } = await supabase.rpc('reopen_mifal_balance', { p_mifal_id: id });
    if (error) { console.error('שגיאה בפתיחה מחדש של יתרת המפעל:', error); return { error: error.message }; }
    await reload();
    return { error: null };
  }

  return { mifal, loading, reload, updateMifal, deleteMifal, transferBalance, reopenBalance };
}
