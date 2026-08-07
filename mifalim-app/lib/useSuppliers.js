'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from './supabaseClient';

// System-wide supplier directory (shared across every mifal/mega-project expense) — backs the
// creatable supplier picker in the expenses grid.
export function useSuppliers() {
  const supabase = createClient();
  const [suppliers, setSuppliers] = useState([]);

  const reload = useCallback(async () => {
    const { data, error } = await supabase.from('suppliers').select('name').order('name');
    if (error) { console.error('שגיאה בטעינת ספקים:', error); return; }
    setSuppliers((data || []).map(r => r.name));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { suppliers, reload };
}
