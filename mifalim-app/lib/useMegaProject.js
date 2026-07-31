'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from './supabaseClient';

// Single mega project + its linked mifalim (via mega_project_links).
export function useMegaProject(id) {
  const supabase = createClient();
  const [megaProject, setMegaProject] = useState(null);
  const [linkedMifalim, setLinkedMifalim] = useState([]);
  const [allMifalim, setAllMifalim] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: mp, error: e1 }, { data: links, error: e2 }, { data: all, error: e3 }] = await Promise.all([
      supabase.from('mega_projects').select('*').eq('id', id).single(),
      supabase.from('mega_project_links').select('mifal_id, mifalim(*)').eq('mega_project_id', id),
      supabase.from('mifalim').select('*').order('created_at', { ascending: false }),
    ]);
    if (e1) console.error('שגיאה בטעינת פרויקט על:', e1);
    if (e2) console.error('שגיאה בטעינת מפעלים מקושרים:', e2);
    if (e3) console.error('שגיאה בטעינת מפעלים:', e3);
    setMegaProject(mp || null);
    setLinkedMifalim((links || []).map(l => l.mifalim).filter(Boolean));
    setAllMifalim(all || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  async function linkMifal(mifalId) {
    const { error } = await supabase.from('mega_project_links').insert({ mega_project_id: id, mifal_id: mifalId });
    if (error) { console.error('שגיאה בשיוך מפעל:', error); return; }
    reload();
  }

  async function unlinkMifal(mifalId) {
    const { error } = await supabase.from('mega_project_links').delete().eq('mega_project_id', id).eq('mifal_id', mifalId);
    if (error) { console.error('שגיאה בביטול שיוך:', error); return; }
    setLinkedMifalim(prev => prev.filter(m => m.id !== mifalId));
  }

  return { megaProject, linkedMifalim, allMifalim, loading, linkMifal, unlinkMifal, reload };
}
