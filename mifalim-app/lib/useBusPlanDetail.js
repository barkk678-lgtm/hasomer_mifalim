'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from './supabaseClient';
import { uid } from './busBoardHelpers';

// One bus plan's bus types + groups (the real, editable source data) plus the interactive
// allocation board (buses + draggable group "pieces"), stored as one JSONB blob in bus_boards —
// same shape/rationale as the original: it's working/derived data edited constantly via
// drag-and-drop, not worth normalizing into its own tables. bus_groups stays the source of truth.
export function useBusPlanDetail(planId) {
  const supabase = createClient();
  const [busTypes, setBusTypes] = useState([]);
  const [groups, setGroups] = useState([]);
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!planId) return;
    setLoading(true);
    const [{ data: types, error: e1 }, { data: grps, error: e2 }, { data: boardRow, error: e3 }] = await Promise.all([
      supabase.from('bus_types').select('*').eq('bus_plan_id', planId),
      supabase.from('bus_groups').select('*').eq('bus_plan_id', planId),
      supabase.from('bus_boards').select('*').eq('bus_plan_id', planId).maybeSingle(),
    ]);
    if (e1) console.error('שגיאה בטעינת סוגי אוטובוסים:', e1);
    if (e2) console.error('שגיאה בטעינת קבוצות:', e2);
    if (e3) console.error('שגיאה בטעינת סידור אוטובוסים:', e3);
    setBusTypes(types || []);
    setGroups(grps || []);
    setBoard(boardRow || null);
    setLoading(false);
  }, [planId]);

  useEffect(() => { reload(); }, [reload]);

  async function createBusType(row) {
    const { data, error } = await supabase.from('bus_types').insert({ ...row, bus_plan_id: planId }).select().single();
    if (error) { console.error('שגיאה בהוספת סוג אוטובוס:', error); return null; }
    setBusTypes(prev => [...prev, data]);
    return data;
  }
  async function updateBusType(id, patch) {
    const { data, error } = await supabase.from('bus_types').update(patch).eq('id', id).select().single();
    if (error) { console.error('שגיאה בעדכון סוג אוטובוס:', error); return null; }
    setBusTypes(prev => prev.map(t => (t.id === id ? data : t)));
    return data;
  }
  async function deleteBusType(id) {
    const { error } = await supabase.from('bus_types').delete().eq('id', id);
    if (error) { console.error('שגיאה במחיקת סוג אוטובוס:', error); return; }
    setBusTypes(prev => prev.filter(t => t.id !== id));
  }

  async function createGroup(row) {
    const { data, error } = await supabase.from('bus_groups').insert({ ...row, bus_plan_id: planId }).select().single();
    if (error) { console.error('שגיאה בהוספת קבוצה:', error); return null; }
    setGroups(prev => [...prev, data]);
    return data;
  }
  async function updateGroup(id, patch) {
    const { data, error } = await supabase.from('bus_groups').update(patch).eq('id', id).select().single();
    if (error) { console.error('שגיאה בעדכון קבוצה:', error); return null; }
    setGroups(prev => prev.map(g => (g.id === id ? data : g)));
    return data;
  }
  async function deleteGroup(id) {
    const { error } = await supabase.from('bus_groups').delete().eq('id', id);
    if (error) { console.error('שגיאה במחיקת קבוצה:', error); return; }
    setGroups(prev => prev.filter(g => g.id !== id));
  }

  // Bulk-import (Excel upload): appends new groups. If a board already exists, the new groups
  // land as unassigned pieces in it directly and every existing bus assignment is left
  // untouched — matches the original's addGroupsPreservingBoard behavior.
  async function addGroupsBulk(newGroups) {
    const { data, error } = await supabase.from('bus_groups').insert(newGroups.map(g => ({ ...g, bus_plan_id: planId }))).select();
    if (error) { console.error('שגיאה בייבוא קבוצות:', error); return []; }
    setGroups(prev => [...data, ...prev]);
    if (board) {
      const newPieces = data.map(g => ({ id: uid('piece'), sourceGroupId: g.id, group_name: g.group_name, quantity: g.quantity, pickup_point: g.pickup_point, bus_id: null, is_split: false, split_label: null }));
      await updateBoard({ ...board.board, pieces: [...newPieces, ...board.board.pieces] });
    }
    return data;
  }

  async function updateBoard(newBoardData) {
    const { data, error } = await supabase.from('bus_boards').upsert({ bus_plan_id: planId, board: newBoardData, updated_at: new Date().toISOString() }).select().single();
    if (error) { console.error('שגיאה בעדכון סידור אוטובוסים:', error); return null; }
    setBoard(data);
    return data;
  }

  return { busTypes, groups, board, loading, createBusType, updateBusType, deleteBusType, createGroup, updateGroup, deleteGroup, addGroupsBulk, updateBoard, reload };
}
