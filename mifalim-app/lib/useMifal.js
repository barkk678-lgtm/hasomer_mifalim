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
    const { data, error } = await supabase.from('mifalim').update(patch).eq('id', id).select().single();
    if (error) { console.error('שגיאה בעדכון מפעל:', error); return null; }
    setMifal(data);
    return data;
  }

  return { mifal, loading, reload, updateMifal };
}
