'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from './supabaseClient';

// Same pattern as useMifalim.js — one hook, real Supabase CRUD, joined to the parent mifal's name.
export function useTasks() {
  const supabase = createClient();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('tasks').select('*, mifalim(name)').order('deadline', { ascending: true, nullsFirst: false });
    if (error) console.error('שגיאה בטעינת משימות:', error);
    setTasks(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  async function createTask(task) {
    const { data, error } = await supabase.from('tasks').insert(task).select('*, mifalim(name)').single();
    if (error) { console.error('שגיאה ביצירת משימה:', error); return null; }
    setTasks(prev => [data, ...prev]);
    return data;
  }

  async function updateTask(id, patch) {
    const { data, error } = await supabase.from('tasks').update(patch).eq('id', id).select('*, mifalim(name)').single();
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

  return { tasks, loading, reload, createTask, updateTask, deleteTask };
}
