'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from './supabaseClient';

// Shared by mifal budgets and mega-project budgets — `ownerType` is 'mifal' | 'mega_project',
// matching the polymorphic owner_type/owner_id columns on external_income and expenses.
export function useBudget(ownerType, ownerId) {
  const supabase = createClient();
  const [income, setIncome] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    const [{ data: inc, error: e1 }, { data: exp, error: e2 }] = await Promise.all([
      supabase.from('external_income').select('*').eq('owner_type', ownerType).eq('owner_id', ownerId),
      supabase.from('expenses').select('*').eq('owner_type', ownerType).eq('owner_id', ownerId),
    ]);
    if (e1) console.error('שגיאה בטעינת הכנסות:', e1);
    if (e2) console.error('שגיאה בטעינת הוצאות:', e2);
    setIncome(inc || []);
    setExpenses(exp || []);
    setLoading(false);
  }, [ownerType, ownerId]);

  useEffect(() => { reload(); }, [reload]);

  async function addIncome(row) {
    const { data, error } = await supabase.from('external_income').insert({ ...row, owner_type: ownerType, owner_id: ownerId }).select().single();
    if (error) { console.error('שגיאה בהוספת הכנסה:', error); return null; }
    setIncome(prev => [...prev, data]);
    return data;
  }
  async function deleteIncome(id) {
    const { error } = await supabase.from('external_income').delete().eq('id', id);
    if (error) { console.error('שגיאה במחיקת הכנסה:', error); return; }
    setIncome(prev => prev.filter(r => r.id !== id));
  }

  async function addExpense(row) {
    const { data, error } = await supabase.from('expenses').insert({ ...row, owner_type: ownerType, owner_id: ownerId }).select().single();
    if (error) { console.error('שגיאה בהוספת הוצאה:', error); return null; }
    setExpenses(prev => [...prev, data]);
    return data;
  }
  async function deleteExpense(id) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) { console.error('שגיאה במחיקת הוצאה:', error); return; }
    setExpenses(prev => prev.filter(r => r.id !== id));
  }

  return { income, expenses, loading, addIncome, deleteIncome, addExpense, deleteExpense };
}
