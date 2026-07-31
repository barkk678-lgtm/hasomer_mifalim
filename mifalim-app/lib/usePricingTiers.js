'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from './supabaseClient';

export function usePricingTiers(mifalId) {
  const supabase = createClient();
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!mifalId) return;
    setLoading(true);
    const { data, error } = await supabase.from('pricing_tiers').select('*').eq('mifal_id', mifalId);
    if (error) console.error('שגיאה בטעינת רמות תמחור:', error);
    setTiers(data || []);
    setLoading(false);
  }, [mifalId]);

  useEffect(() => { reload(); }, [reload]);

  async function createTier(row) {
    const { data, error } = await supabase.from('pricing_tiers').insert({ ...row, mifal_id: mifalId }).select().single();
    if (error) { console.error('שגיאה בהוספת רמת תמחור:', error); return null; }
    setTiers(prev => [...prev, data]);
    return data;
  }

  async function updateTier(id, patch) {
    const { data, error } = await supabase.from('pricing_tiers').update(patch).eq('id', id).select().single();
    if (error) { console.error('שגיאה בעדכון רמת תמחור:', error); return null; }
    setTiers(prev => prev.map(t => (t.id === id ? data : t)));
    return data;
  }

  async function deleteTier(id) {
    const { error } = await supabase.from('pricing_tiers').delete().eq('id', id);
    if (error) { console.error('שגיאה במחיקת רמת תמחור:', error); return; }
    setTiers(prev => prev.filter(t => t.id !== id));
  }

  return { tiers, loading, createTier, updateTier, deleteTier };
}
