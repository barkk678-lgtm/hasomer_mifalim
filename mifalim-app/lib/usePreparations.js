'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from './supabaseClient';

// "הכנות מדריכים משויכות" — mifalim rows with type='preparation' whose parent_mifal_id
// points back at the mifal being viewed.
export function usePreparations(parentMifalId) {
  const supabase = createClient();
  const [preparations, setPreparations] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!parentMifalId) return;
    setLoading(true);
    const { data, error } = await supabase.from('mifalim').select('*').eq('type', 'preparation').eq('parent_mifal_id', parentMifalId).order('created_at', { ascending: false });
    if (error) console.error('שגיאה בטעינת הכנות מדריכים:', error);
    setPreparations(data || []);
    setLoading(false);
  }, [parentMifalId]);

  useEffect(() => { reload(); }, [reload]);

  async function createPreparation(mifal) {
    const { data, error } = await supabase.from('mifalim').insert({ ...mifal, type: 'preparation', parent_mifal_id: parentMifalId }).select().single();
    if (error) { console.error('שגיאה ביצירת הכנת מדריכים:', error); return null; }
    setPreparations(prev => [data, ...prev]);
    return data;
  }

  return { preparations, loading, createPreparation };
}
