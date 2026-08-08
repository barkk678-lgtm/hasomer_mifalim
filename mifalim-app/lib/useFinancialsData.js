'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from './supabaseClient';

// Bulk-fetches everything the annual financials page needs (mifalim, pricing tiers, income,
// expenses, mega projects + their links) in one round-trip per table, then folds it into
// per-mifal / per-mega-project totals client-side — same "cheap aggregation" approach as
// useMifalim.js, just wider (it also needs each mifal's raw expense rows for the
// by-expense-type drill-down, and mega-project-level income/expenses).
export function useFinancialsData() {
  const supabase = createClient();
  const [mifalim, setMifalim] = useState([]);
  const [megaProjects, setMegaProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [
      { data: mifalimData, error: e1 },
      { data: tiers, error: e2 },
      { data: income, error: e3 },
      { data: expenses, error: e4 },
      { data: megaProjectsData, error: e5 },
      { data: links, error: e6 },
    ] = await Promise.all([
      supabase.from('mifalim').select('*'),
      supabase.from('pricing_tiers').select('mifal_id, actual_participants, expected_participants, price_per_participant'),
      supabase.from('external_income').select('owner_type, owner_id, amount'),
      supabase.from('expenses').select('owner_type, owner_id, quantity, unit_price, expense_type, expense_name, suppliers(name)'),
      supabase.from('mega_projects').select('*'),
      supabase.from('mega_project_links').select('mega_project_id, mifal_id'),
    ]);
    [e1, e2, e3, e4, e5, e6].forEach(e => { if (e) console.error('שגיאה בטעינת נתוני יתרות:', e); });

    const withFinancials = (mifalimData || []).map(m => {
      const myTiers = (tiers || []).filter(t => t.mifal_id === m.id);
      const myIncome = (income || []).filter(r => r.owner_type === 'mifal' && r.owner_id === m.id);
      const myExpenses = (expenses || []).filter(r => r.owner_type === 'mifal' && r.owner_id === m.id);

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
        expenseRows: myExpenses,
      };
    });

    const withLinks = (megaProjectsData || []).map(mp => {
      const myExpenses = (expenses || []).filter(r => r.owner_type === 'mega_project' && r.owner_id === mp.id);
      const ownIncome = (income || []).filter(r => r.owner_type === 'mega_project' && r.owner_id === mp.id).reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const ownExpenses = myExpenses.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unit_price) || 0), 0);
      return {
        ...mp,
        linked_mifal_ids: (links || []).filter(l => l.mega_project_id === mp.id).map(l => l.mifal_id),
        ownIncome, ownExpenses,
        expenseRows: myExpenses,
      };
    });

    setMifalim(withFinancials);
    setMegaProjects(withLinks);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { mifalim, megaProjects, loading };
}
