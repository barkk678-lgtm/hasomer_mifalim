'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from './supabaseClient';

// ============================================================================
// THE PATTERN, worked end-to-end for one entity ("mifalim"). Every other entity
// in the app (tasks, expenses, stakeholders, bus_plans, permission_users, etc.)
// gets converted the exact same way — copy this file, rename, point at the
// matching table from schema.sql.
//
// BEFORE (inside the chat artifact):
//   const res = await window.storage.get(STORAGE_KEY, true);
//   const parsed = JSON.parse(res.value);
//   setMifalim(parsed.mifalim || []);
//
// AFTER (this file):
//   const { data } = await supabase.from('mifalim').select('*');
//   setMifalim(data || []);
//
// Same idea everywhere: window.storage.get/set → supabase.from('table').select/insert/update/delete.
// ============================================================================

export function useMifalim() {
  const supabase = createClient();
  const [mifalim, setMifalim] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [{ data, error }, { data: tiers }, { data: income }, { data: expenses }] = await Promise.all([
      supabase.from('mifalim').select('*').order('created_at', { ascending: false }),
      supabase.from('pricing_tiers').select('mifal_id, actual_participants, price_per_participant'),
      supabase.from('external_income').select('owner_id, amount').eq('owner_type', 'mifal'),
      supabase.from('expenses').select('owner_id, quantity, unit_price').eq('owner_type', 'mifal'),
    ]);
    if (error) console.error('שגיאה בטעינת מפעלים:', error);
    // Cheap client-side aggregation (participants + balance) for the list's summary columns —
    // one round-trip per underlying table instead of one per mifal.
    const withSummary = (data || []).map(m => {
      const myTiers = (tiers || []).filter(t => t.mifal_id === m.id);
      const participants = myTiers.reduce((s, t) => s + (Number(t.actual_participants) || 0), 0);
      const tiersIncome = myTiers.reduce((s, t) => s + (Number(t.actual_participants) || 0) * (Number(t.price_per_participant) || 0), 0);
      const extIncome = (income || []).filter(r => r.owner_id === m.id).reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const totalExpenses = (expenses || []).filter(r => r.owner_id === m.id).reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unit_price) || 0), 0);
      return { ...m, participants, balance: tiersIncome + extIncome - totalExpenses };
    });
    setMifalim(withSummary);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  async function createMifal(mifal) {
    const { data, error } = await supabase.from('mifalim').insert(mifal).select().single();
    if (error) { console.error('שגיאה ביצירת מפעל:', error); return null; }
    setMifalim(prev => [{ ...data, participants: 0, balance: 0 }, ...prev]); // same "new items go on top" behavior as the original app
    return data;
  }

  async function updateMifal(id, patch) {
    // `patch` here is usually the edit modal's draft, seeded from a row out of `mifalim` —
    // which carries the `participants`/`balance` fields this hook computes client-side above.
    // Those aren't real columns; sending them through silently fails the whole update (Postgres
    // rejects the unknown columns), which from the list screen looked like "edits don't save".
    const { participants, balance, ...cleanPatch } = patch;
    const { data, error } = await supabase.from('mifalim').update(cleanPatch).eq('id', id).select().single();
    if (error) { console.error('שגיאה בעדכון מפעל:', error); return null; }
    setMifalim(prev => prev.map(m => (m.id === id ? { ...data, participants: m.participants, balance: m.balance } : m)));
    return data;
  }

  async function deleteMifal(id) {
    const { error } = await supabase.from('mifalim').delete().eq('id', id);
    if (error) { console.error('שגיאה במחיקת מפעל:', error); return false; }
    setMifalim(prev => prev.filter(m => m.id !== id));
    return true;
  }

  return { mifalim, loading, reload, createMifal, updateMifal, deleteMifal };
}
