'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from './supabaseClient';

export function useStakeholders(mifalId) {
  const supabase = createClient();
  const [stakeholders, setStakeholders] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!mifalId) return;
    setLoading(true);
    const { data, error } = await supabase.from('stakeholders').select('*').eq('mifal_id', mifalId);
    if (error) console.error('שגיאה בטעינת בעלי תפקידים:', error);
    setStakeholders(data || []);
    setLoading(false);
  }, [mifalId]);

  useEffect(() => { reload(); }, [reload]);

  async function createStakeholder(row) {
    const { data, error } = await supabase.from('stakeholders').insert({ ...row, mifal_id: mifalId }).select().single();
    if (error) { console.error('שגיאה בהוספת בעל תפקיד:', error); return null; }
    setStakeholders(prev => [...prev, data]);
    return data;
  }

  async function deleteStakeholder(id) {
    const { error } = await supabase.from('stakeholders').delete().eq('id', id);
    if (error) { console.error('שגיאה במחיקת בעל תפקיד:', error); return; }
    setStakeholders(prev => prev.filter(s => s.id !== id));
  }

  return { stakeholders, loading, createStakeholder, deleteStakeholder };
}
