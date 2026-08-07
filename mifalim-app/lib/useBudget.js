'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [budgetError, setBudgetError] = useState('');
  const [classifyingIds, setClassifyingIds] = useState(() => new Set());
  const expensesRef = useRef([]);
  const classifyTimers = useRef({});
  useEffect(() => { expensesRef.current = expenses; }, [expenses]);

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
    setBudgetError('');
    const { data, error } = await supabase.from('external_income').insert({ ...row, owner_type: ownerType, owner_id: ownerId }).select().single();
    if (error) { console.error('שגיאה בהוספת הכנסה:', error); setBudgetError(`שגיאה בהוספת הכנסה: ${error.message}`); return null; }
    setIncome(prev => [...prev, data]);
    return data;
  }
  async function updateIncome(id, patch) {
    setBudgetError('');
    const { data, error } = await supabase.from('external_income').update(patch).eq('id', id).select().single();
    if (error) { console.error('שגיאה בעדכון הכנסה:', error); setBudgetError(`שגיאה בעדכון הכנסה: ${error.message}`); return null; }
    setIncome(prev => prev.map(r => (r.id === id ? data : r)));
    return data;
  }
  async function deleteIncome(id) {
    const { error } = await supabase.from('external_income').delete().eq('id', id);
    if (error) { console.error('שגיאה במחיקת הכנסה:', error); setBudgetError(`שגיאה במחיקת הכנסה: ${error.message}`); return; }
    setIncome(prev => prev.filter(r => r.id !== id));
  }

  // suppliers is a shared, system-wide directory (see schema) — expenses point at it via
  // supplier_id, so a typed supplier name here reuses an existing row or creates one.
  // .limit(1) + array read (instead of .maybeSingle()) so a pre-existing duplicate supplier
  // name doesn't throw "multiple rows returned" and silently abort the whole expense save.
  async function resolveSupplierId(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return { id: null, error: null };
    const { data: existing, error: selectError } = await supabase.from('suppliers').select('id').eq('name', trimmed).limit(1);
    if (selectError) return { id: null, error: selectError };
    if (existing && existing.length > 0) return { id: existing[0].id, error: null };
    const { data: created, error } = await supabase.from('suppliers').insert({ name: trimmed }).select('id').single();
    if (error) return { id: null, error };
    return { id: created.id, error: null };
  }

  async function resolvePatch(patch) {
    if (!('supplier_name' in patch)) return { patch, error: null };
    const { supplier_name, ...rest } = patch;
    const { id, error } = await resolveSupplierId(supplier_name);
    if (error) return { patch: null, error };
    return { patch: { ...rest, supplier_id: id }, error: null };
  }

  // Auto-fills expense_type via the /api/classify-expense route (OpenAI, server-side key) once
  // both expense_name and supplier_name are known — mirrors the original demo's maybeClassify:
  // debounced, never overwrites a type the user already picked, silent on failure.
  function maybeClassifyExpense(row) {
    if (!row || row.expense_type) return;
    const description = row.expense_name?.trim();
    const supplier = row.supplier_name?.trim();
    if (!description || !supplier) return;
    clearTimeout(classifyTimers.current[row.id]);
    classifyTimers.current[row.id] = setTimeout(async () => {
      setClassifyingIds(s => new Set(s).add(row.id));
      try {
        const res = await fetch('/api/classify-expense', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supplier, description }),
        });
        if (!res.ok) return;
        const { type } = await res.json();
        if (!type) return;
        const current = expensesRef.current.find(r => r.id === row.id);
        if (current && !current.expense_type) await updateExpense(row.id, { expense_type: type });
      } catch { /* silent — leave expense_type empty for manual selection */ }
      finally { setClassifyingIds(s => { const n = new Set(s); n.delete(row.id); return n; }); }
    }, 300);
  }

  async function addExpense(row) {
    setBudgetError('');
    const { patch: resolved, error: resolveError } = await resolvePatch(row);
    if (resolveError) { console.error('שגיאה בשיוך ספק:', resolveError); setBudgetError(`שגיאה בשיוך ספק: ${resolveError.message}`); return null; }
    const { data, error } = await supabase.from('expenses').insert({ ...resolved, owner_type: ownerType, owner_id: ownerId }).select(EXPENSE_SELECT).single();
    if (error) { console.error('שגיאה בהוספת הוצאה:', error); setBudgetError(`שגיאה בהוספת הוצאה: ${error.message}`); return null; }
    const withName = withSupplierName(data);
    setExpenses(prev => [...prev, withName]);
    maybeClassifyExpense(withName);
    return withName;
  }
  async function updateExpense(id, patch) {
    setBudgetError('');
    const { patch: resolved, error: resolveError } = await resolvePatch(patch);
    if (resolveError) { console.error('שגיאה בשיוך ספק:', resolveError); setBudgetError(`שגיאה בשיוך ספק: ${resolveError.message}`); return null; }
    const { data, error } = await supabase.from('expenses').update(resolved).eq('id', id).select(EXPENSE_SELECT).single();
    if (error) { console.error('שגיאה בעדכון הוצאה:', error); setBudgetError(`שגיאה בעדכון הוצאה: ${error.message}`); return null; }
    const withName = withSupplierName(data);
    setExpenses(prev => prev.map(r => (r.id === id ? withName : r)));
    maybeClassifyExpense(withName);
    return withName;
  }
  async function deleteExpense(id) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) { console.error('שגיאה במחיקת הוצאה:', error); setBudgetError(`שגיאה במחיקת הוצאה: ${error.message}`); return; }
    setExpenses(prev => prev.filter(r => r.id !== id));
  }

  return { income, expenses, loading, addIncome, updateIncome, deleteIncome, addExpense, updateExpense, deleteExpense, budgetError, classifyingIds };
}
