'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from './supabaseClient';

export function useMegaProjects() {
  const supabase = createClient();
  const [megaProjects, setMegaProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('mega_projects').select('*').order('created_at', { ascending: false });
    if (error) console.error('שגיאה בטעינת פרויקטי על:', error);
    setMegaProjects(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  async function createMegaProject(mp) {
    const { data, error } = await supabase.from('mega_projects').insert(mp).select().single();
    if (error) { console.error('שגיאה ביצירת פרויקט על:', error); return null; }
    setMegaProjects(prev => [data, ...prev]);
    return data;
  }

  async function deleteMegaProject(id) {
    const { error } = await supabase.from('mega_projects').delete().eq('id', id);
    if (error) { console.error('שגיאה במחיקת פרויקט על:', error); return false; }
    setMegaProjects(prev => prev.filter(mp => mp.id !== id));
    return true;
  }

  return { megaProjects, loading, reload, createMegaProject, deleteMegaProject };
}
