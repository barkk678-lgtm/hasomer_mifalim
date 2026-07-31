'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from './supabaseClient';

export function useOccurrences(mifalId) {
  const supabase = createClient();
  const [occurrences, setOccurrences] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!mifalId) return;
    setLoading(true);
    const { data, error } = await supabase.from('occurrences').select('*').eq('mifal_id', mifalId).order('start_date', { ascending: true, nullsFirst: false });
    if (error) console.error('שגיאה בטעינת מופעים:', error);
    setOccurrences(data || []);
    setLoading(false);
  }, [mifalId]);

  useEffect(() => { reload(); }, [reload]);

  async function createOccurrence(row) {
    const { data, error } = await supabase.from('occurrences').insert({ ...row, mifal_id: mifalId }).select().single();
    if (error) { console.error('שגיאה ביצירת מופע:', error); return null; }
    setOccurrences(prev => [...prev, data]);
    return data;
  }

  async function updateOccurrence(id, patch) {
    const { data, error } = await supabase.from('occurrences').update(patch).eq('id', id).select().single();
    if (error) { console.error('שגיאה בעדכון מופע:', error); return null; }
    setOccurrences(prev => prev.map(o => (o.id === id ? data : o)));
    return data;
  }

  async function deleteOccurrence(id) {
    const { error } = await supabase.from('occurrences').delete().eq('id', id);
    if (error) { console.error('שגיאה במחיקת מופע:', error); return; }
    setOccurrences(prev => prev.filter(o => o.id !== id));
  }

  return { occurrences, loading, createOccurrence, updateOccurrence, deleteOccurrence };
}
