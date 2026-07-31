'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from './supabaseClient';

const EXPENSE_SELECT = '*, suppliers(name)';
function withSupplierName(row) { return { ...row, supplier_name: row.suppliers?.name || '' }; }

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
      supabase.from('expenses').select(EXPENSE_SELECT).eq('owner_type', ownerType).eq('owner_id', ownerId),
    ]);
    if (e1) console.error('שגיאה בטעינת הכנסות:', e1);
    if (e2) console.error('שגיאה בטעינת הוצאות:', e2);
    setIncome(inc || []);
    setExpenses((exp || []).map(withSupplierName));
    setLoading(false);
  }, [ownerType, ownerId]);

  useEffect(() => { reload(); }, [reload]);

  async function addIncome(row) {
    const { data, error } = await supabase.from('external_income').insert({ ...row, owner_type: ownerType, owner_id: ownerId }).select().single();
    if (error) { console.error('שגיאה בהוספת הכנסה:', error); return null; }
    setIncome(prev => [...prev, data]);
    return data;
  }
  async function updateIncome(id, patch) {
    const { data, error } = await supabase.from('external_income').update(patch).eq('id', id).select().single();
    if (error) { console.error('שגיאה בעדכון הכנסה:', error); return null; }
    setIncome(prev => prev.map(r => (r.id === id ? data : r)));
    return data;
  }
  async function deleteIncome(id) {
    const { error } = await supabase.from('external_income').delete().eq('id', id);
    if (error) { console.error('שגיאה במחיקת הכנסה:', error); return; }
    setIncome(prev => prev.filter(r => r.id !== id));
  }

  // suppliers is a shared, system-wide directory (see schema) — expenses point at it via
  // supplier_id, so a typed supplier name here reuses an existing row or creates one.
  async function resolveSupplierId(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;
    const { data: existing } = await supabase.from('suppliers').select('id').eq('name', trimmed).maybeSingle();
    if (existing) return existing.id;
    const { data: created, error } = await supabase.from('suppliers').insert({ name: trimmed }).select('id').single();
    if (error) { console.error('שגיאה ביצירת ספק:', error); return null; }
    return created.id;
  }

  async function resolvePatch(patch) {
    if (!('supplier_name' in patch)) return patch;
    const { supplier_name, ...rest } = patch;
    return { ...rest, supplier_id: await resolveSupplierId(supplier_name) };
  }

  async function addExpense(row) {
    const resolved = await resolvePatch(row);
    const { data, error } = await supabase.from('expenses').insert({ ...resolved, owner_type: ownerType, owner_id: ownerId }).select(EXPENSE_SELECT).single();
    if (error) { console.error('שגיאה בהוספת הוצאה:', error); return null; }
    const withName = withSupplierName(data);
    setExpenses(prev => [...prev, withName]);
    return withName;
  }
  async function updateExpense(id, patch) {
    const resolved = await resolvePatch(patch);
    const { data, error } = await supabase.from('expenses').update(resolved).eq('id', id).select(EXPENSE_SELECT).single();
    if (error) { console.error('שגיאה בעדכון הוצאה:', error); return null; }
    const withName = withSupplierName(data);
    setExpenses(prev => prev.map(r => (r.id === id ? withName : r)));
    return withName;
  }
  async function deleteExpense(id) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) { console.error('שגיאה במחיקת הוצאה:', error); return; }
    setExpenses(prev => prev.filter(r => r.id !== id));
  }

  return { income, expenses, loading, addIncome, updateIncome, deleteIncome, addExpense, updateExpense, deleteExpense };
}
