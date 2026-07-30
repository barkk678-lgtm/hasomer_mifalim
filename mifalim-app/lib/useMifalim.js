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
    const { data, error } = await supabase.from('mifalim').select('*').order('created_at', { ascending: false });
    if (error) console.error('שגיאה בטעינת מפעלים:', error);
    setMifalim(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  async function createMifal(mifal) {
    const { data, error } = await supabase.from('mifalim').insert(mifal).select().single();
    if (error) { console.error('שגיאה ביצירת מפעל:', error); return null; }
    setMifalim(prev => [data, ...prev]); // same "new items go on top" behavior as the original app
    return data;
  }

  async function updateMifal(id, patch) {
    const { data, error } = await supabase.from('mifalim').update(patch).eq('id', id).select().single();
    if (error) { console.error('שגיאה בעדכון מפעל:', error); return null; }
    setMifalim(prev => prev.map(m => (m.id === id ? data : m)));
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
