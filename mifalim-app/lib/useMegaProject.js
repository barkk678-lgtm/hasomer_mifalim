'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from './supabaseClient';

// Single mega project + its linked mifalim (via mega_project_links), each linked mifal enriched
// with the same expected/actual participants+income+expenses+balance fields useFinancialsData.js
// computes for the annual financials page — the mega project detail view needs the identical
// numbers (its own report table + the aggregate expected/actual stat blocks).
export function useMegaProject(id) {
  const supabase = createClient();
  const [megaProject, setMegaProject] = useState(null);
  const [linkedMifalim, setLinkedMifalim] = useState([]);
  const [allMifalim, setAllMifalim] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [
      { data: mp, error: e1 },
      { data: links, error: e2 },
      { data: all, error: e3 },
      { data: tiers, error: e4 },
      { data: income, error: e5 },
      { data: expenses, error: e6 },
    ] = await Promise.all([
      supabase.from('mega_projects').select('*').eq('id', id).single(),
      supabase.from('mega_project_links').select('mifal_id, mifalim(*)').eq('mega_project_id', id),
      supabase.from('mifalim').select('*').order('created_at', { ascending: false }),
      supabase.from('pricing_tiers').select('mifal_id, actual_participants, expected_participants, price_per_participant'),
      supabase.from('external_income').select('owner_type, owner_id, amount').eq('owner_type', 'mifal'),
      supabase.from('expenses').select('owner_type, owner_id, quantity, unit_price').eq('owner_type', 'mifal'),
    ]);
    if (e1) console.error('שגיאה בטעינת פרויקט על:', e1);
    if (e2) console.error('שגיאה בטעינת מפעלים מקושרים:', e2);
    if (e3) console.error('שגיאה בטעינת מפעלים:', e3);
    if (e4) console.error('שגיאה בטעינת מחירונים:', e4);
    if (e5) console.error('שגיאה בטעינת הכנסות:', e5);
    if (e6) console.error('שגיאה בטעינת הוצאות:', e6);

    function enrich(m) {
      const myTiers = (tiers || []).filter(t => t.mifal_id === m.id);
      const myIncome = (income || []).filter(r => r.owner_id === m.id);
      const myExpenses = (expenses || []).filter(r => r.owner_id === m.id);
      const participants = myTiers.reduce((s, t) => s + (Number(t.actual_participants) || 0), 0);
      const expectedParticipants = myTiers.reduce((s, t) => s + (Number(t.expected_participants) || 0), 0);
      const tiersIncome = myTiers.reduce((s, t) => s + (Number(t.actual_participants) || 0) * (Number(t.price_per_participant) || 0), 0);
      const tiersExpectedIncome = myTiers.reduce((s, t) => s + (Number(t.expected_participants) || 0) * (Number(t.price_per_participant) || 0), 0);
      const externalIncome = myIncome.reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const totalExpenses = myExpenses.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unit_price) || 0), 0);
      const totalIncome = tiersIncome + externalIncome;
      const totalExpectedIncome = tiersExpectedIncome + externalIncome;
      return {
        ...m,
        participants, expectedParticipants,
        totalIncome, totalExpectedIncome, totalExpenses,
        balance: totalIncome - totalExpenses,
        expectedBalance: totalExpectedIncome - totalExpenses,
      };
    }

    setMegaProject(mp || null);
    setLinkedMifalim((links || []).map(l => l.mifalim).filter(Boolean).map(enrich));
    setAllMifalim((all || []).map(enrich));
    setLoading(false);
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  async function linkMifal(mifalId) {
    const { error } = await supabase.from('mega_project_links').insert({ mega_project_id: id, mifal_id: mifalId });
    if (error) { console.error('שגיאה בשיוך מפעל:', error); return; }
    reload();
  }

  async function unlinkMifal(mifalId) {
    const { error } = await supabase.from('mega_project_links').delete().eq('mega_project_id', id).eq('mifal_id', mifalId);
    if (error) { console.error('שגיאה בביטול שיוך:', error); return; }
    setLinkedMifalim(prev => prev.filter(m => m.id !== mifalId));
  }

  async function deleteMegaProject() {
    const { error } = await supabase.from('mega_projects').delete().eq('id', id);
    if (error) { console.error('שגיאה במחיקת פרויקט על:', error); return false; }
    return true;
  }

  return { megaProject, linkedMifalim, allMifalim, loading, linkMifal, unlinkMifal, deleteMegaProject, reload };
}
