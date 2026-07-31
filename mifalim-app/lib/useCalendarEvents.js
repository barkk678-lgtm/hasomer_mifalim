'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from './supabaseClient';

// Master calendar reads from the same mifalim + occurrences data as everywhere else in the
// app — this hook just fetches both in bulk and nests each mifal's occurrences client-side,
// so CalendarView's buildEvents() can stay identical to the original's in-memory version.
export function useCalendarEvents() {
  const supabase = createClient();
  const [mifalim, setMifalim] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [{ data: mifalimData, error: e1 }, { data: occData, error: e2 }] = await Promise.all([
      supabase.from('mifalim').select('id, type, name, prep_date_mode, event_date, backup_date, start_date, end_date, backup_start_date, backup_end_date'),
      supabase.from('occurrences').select('mifal_id, name, start_date, end_date'),
    ]);
    if (e1) console.error('שגיאה בטעינת מפעלים ללוח השנה:', e1);
    if (e2) console.error('שגיאה בטעינת מופעים ללוח השנה:', e2);
    const withOccurrences = (mifalimData || []).map(m => ({
      ...m,
      occurrences: (occData || []).filter(o => o.mifal_id === m.id),
    }));
    setMifalim(withOccurrences);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { mifalim, loading };
}
