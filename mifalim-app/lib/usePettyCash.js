'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from './supabaseClient';

const EXPENSE_SELECT = '*, suppliers(name)';
function withSupplierName(row) { return { ...row, supplier_name: row.suppliers?.name || '' }; }
// occurred_at is timestamptz (see supabase/schema/09_petty_cash_management.sql), but the grid's
// date-type cell is a native <input type="date"> which only binds a bare "YYYY-MM-DD" value —
// handed a full ISO timestamp it just renders empty. Slicing to the date part on the way out is
// safe going back in too: Postgres accepts a bare date string as a timestamptz literal (midnight).
function withDateOnly(row) { return { ...row, occurred_at: row.occurred_at ? row.occurred_at.slice(0, 10) : row.occurred_at }; }

// "ניהול יתרות" (petty cash) — income/expenses with owner_type='general' (no mifal/mega-project
// owner, owner_id is NULL — see supabase/schema/09_petty_cash_management.sql), plus the read-only
// history of balances transferred in from mifalim that have financially closed
// (mifal_balance_transfers, written only by the transfer_mifal_balance() RPC via useMifal).
// CRUD shape mirrors useBudget.js exactly; the only structural difference is owner_type/owner_id
// being fixed to 'general'/null instead of taking an ownerType/ownerId pair, and every row here
// carries its own occurred_at (general rows have no owner with an implicit event date).
export function usePettyCash() {
  const supabase = createClient();
  const [transfers, setTransfers] = useState([]);
  const [income, setIncome] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pettyCashError, setPettyCashError] = useState('');
  const [classifyingIds, setClassifyingIds] = useState(() => new Set());
  const expensesRef = useRef([]);
  const classifyTimers = useRef({});
  useEffect(() => { expensesRef.current = expenses; }, [expenses]);

  const reload = useCallback(async () => {
    setLoading(true);
    const [{ data: tr, error: e1 }, { data: inc, error: e2 }, { data: exp, error: e3 }] = await Promise.all([
      supabase.from('mifal_balance_transfers').select('*, mifalim(name)').order('transferred_at', { ascending: true }),
      supabase.from('external_income').select('*').eq('owner_type', 'general').order('occurred_at', { ascending: true }),
      supabase.from('expenses').select(EXPENSE_SELECT).eq('owner_type', 'general').order('occurred_at', { ascending: true }),
    ]);
    if (e1) console.error('שגיאה בטעינת העברות יתרה:', e1);
    if (e2) console.error('שגיאה בטעינת הכנסות קופה קטנה:', e2);
    if (e3) console.error('שגיאה בטעינת הוצאות קופה קטנה:', e3);
    setTransfers(tr || []);
    setIncome((inc || []).map(withDateOnly));
    setExpenses((exp || []).map(row => withDateOnly(withSupplierName(row))));
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  async function addIncome(row) {
    setPettyCashError('');
    const { data, error } = await supabase.from('external_income').insert({ ...row, owner_type: 'general', owner_id: null }).select().single();
    if (error) { console.error('שגיאה בהוספת הכנסה:', error); setPettyCashError(`שגיאה בהוספת הכנסה: ${error.message}`); return null; }
    const withDate = withDateOnly(data);
    setIncome(prev => [...prev, withDate]);
    return withDate;
  }
  async function updateIncome(id, patch) {
    setPettyCashError('');
    const { data, error } = await supabase.from('external_income').update(patch).eq('id', id).select().single();
    if (error) { console.error('שגיאה בעדכון הכנסה:', error); setPettyCashError(`שגיאה בעדכון הכנסה: ${error.message}`); return null; }
    const withDate = withDateOnly(data);
    setIncome(prev => prev.map(r => (r.id === id ? withDate : r)));
    return withDate;
  }
  async function deleteIncome(id) {
    const { error } = await supabase.from('external_income').delete().eq('id', id);
    if (error) { console.error('שגיאה במחיקת הכנסה:', error); setPettyCashError(`שגיאה במחיקת הכנסה: ${error.message}`); return; }
    setIncome(prev => prev.filter(r => r.id !== id));
  }

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
    setPettyCashError('');
    const { patch: resolved, error: resolveError } = await resolvePatch(row);
    if (resolveError) { console.error('שגיאה בשיוך ספק:', resolveError); setPettyCashError(`שגיאה בשיוך ספק: ${resolveError.message}`); return null; }
    const { data, error } = await supabase.from('expenses').insert({ ...resolved, owner_type: 'general', owner_id: null }).select(EXPENSE_SELECT).single();
    if (error) { console.error('שגיאה בהוספת הוצאה:', error); setPettyCashError(`שגיאה בהוספת הוצאה: ${error.message}`); return null; }
    const withName = withDateOnly(withSupplierName(data));
    setExpenses(prev => [...prev, withName]);
    maybeClassifyExpense(withName);
    return withName;
  }
  async function updateExpense(id, patch) {
    setPettyCashError('');
    const { patch: resolved, error: resolveError } = await resolvePatch(patch);
    if (resolveError) { console.error('שגיאה בשיוך ספק:', resolveError); setPettyCashError(`שגיאה בשיוך ספק: ${resolveError.message}`); return null; }
    const { data, error } = await supabase.from('expenses').update(resolved).eq('id', id).select(EXPENSE_SELECT).single();
    if (error) { console.error('שגיאה בעדכון הוצאה:', error); setPettyCashError(`שגיאה בעדכון הוצאה: ${error.message}`); return null; }
    const withName = withDateOnly(withSupplierName(data));
    setExpenses(prev => prev.map(r => (r.id === id ? withName : r)));
    maybeClassifyExpense(withName);
    return withName;
  }
  async function deleteExpense(id) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) { console.error('שגיאה במחיקת הוצאה:', error); setPettyCashError(`שגיאה במחיקת הוצאה: ${error.message}`); return; }
    setExpenses(prev => prev.filter(r => r.id !== id));
  }

  const transfersTotal = transfers.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const incomeTotal = income.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const expensesTotal = expenses.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unit_price) || 0), 0);
  const totalBalance = transfersTotal + incomeTotal - expensesTotal;

  return {
    transfers, income, expenses, loading, totalBalance, transfersTotal, incomeTotal, expensesTotal,
    addIncome, updateIncome, deleteIncome, addExpense, updateExpense, deleteExpense,
    pettyCashError, classifyingIds, reload,
  };
}
