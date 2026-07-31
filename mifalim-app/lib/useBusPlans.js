'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from './supabaseClient';

// A mifal can have several bus plans (e.g. one per destination/direction) — this manages the
// plan list itself; useBusPlanDetail.js manages one plan's bus types + groups + board.
export function useBusPlans(mifalId) {
  const supabase = createClient();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!mifalId) return;
    setLoading(true);
    const { data, error } = await supabase.from('bus_plans').select('*').eq('mifal_id', mifalId).order('created_at', { ascending: true });
    if (error) console.error('שגיאה בטעינת תוכניות הסעה:', error);
    setPlans(data || []);
    setLoading(false);
  }, [mifalId]);

  useEffect(() => { reload(); }, [reload]);

  async function createPlan(name) {
    const { data, error } = await supabase.from('bus_plans').insert({ mifal_id: mifalId, name }).select().single();
    if (error) { console.error('שגיאה ביצירת תוכנית הסעה:', error); return null; }
    setPlans(prev => [...prev, data]);
    return data;
  }

  async function updatePlan(id, patch) {
    const { data, error } = await supabase.from('bus_plans').update(patch).eq('id', id).select().single();
    if (error) { console.error('שגיאה בעדכון תוכנית הסעה:', error); return null; }
    setPlans(prev => prev.map(p => (p.id === id ? data : p)));
    return data;
  }

  async function deletePlan(id) {
    const { error } = await supabase.from('bus_plans').delete().eq('id', id);
    if (error) { console.error('שגיאה במחיקת תוכנית הסעה:', error); return; }
    setPlans(prev => prev.filter(p => p.id !== id));
  }

  return { plans, loading, createPlan, updatePlan, deletePlan };
}
