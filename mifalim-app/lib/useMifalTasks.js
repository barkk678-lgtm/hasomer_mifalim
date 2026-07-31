'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from './supabaseClient';

// Same CRUD pattern as useTasks.js, scoped to one mifal (used inside its DetailView).
export function useMifalTasks(mifalId) {
  const supabase = createClient();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!mifalId) return;
    setLoading(true);
    const { data, error } = await supabase.from('tasks').select('*').eq('mifal_id', mifalId).order('deadline', { ascending: true, nullsFirst: false });
    if (error) console.error('שגיאה בטעינת משימות:', error);
    setTasks(data || []);
    setLoading(false);
  }, [mifalId]);

  useEffect(() => { reload(); }, [reload]);

  async function createTask(task) {
    const { data, error } = await supabase.from('tasks').insert({ ...task, mifal_id: mifalId }).select().single();
    if (error) { console.error('שגיאה ביצירת משימה:', error); return null; }
    setTasks(prev => [data, ...prev]);
    return data;
  }

  async function updateTask(id, patch) {
    const { data, error } = await supabase.from('tasks').update(patch).eq('id', id).select().single();
    if (error) { console.error('שגיאה בעדכון משימה:', error); return null; }
    setTasks(prev => prev.map(t => (t.id === id ? data : t)));
    return data;
  }

  async function deleteTask(id) {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) { console.error('שגיאה במחיקת משימה:', error); return false; }
    setTasks(prev => prev.filter(t => t.id !== id));
    return true;
  }

  return { tasks, loading, createTask, updateTask, deleteTask };
}
