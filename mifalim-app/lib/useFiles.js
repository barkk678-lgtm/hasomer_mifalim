'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from './supabaseClient';

const BUCKET = 'mifal-files';

// Shared by mifal files and mega-project files — same owner_type/owner_id pattern as useBudget.js.
export function useFiles(ownerType, ownerId) {
  const supabase = createClient();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    const { data, error } = await supabase.from('files').select('*, profiles(full_name)').eq('owner_type', ownerType).eq('owner_id', ownerId).order('modified_at', { ascending: false });
    if (error) console.error('שגיאה בטעינת קבצים:', error);
    setFiles(data || []);
    setLoading(false);
  }, [ownerType, ownerId]);

  useEffect(() => { reload(); }, [reload]);

  async function uploadFiles(fileList, category) {
    const { data: { user } } = await supabase.auth.getUser();
    const uploaded = [];
    for (const file of Array.from(fileList)) {
      const path = `${ownerType}/${ownerId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file);
      if (uploadError) { console.error('שגיאה בהעלאת קובץ:', uploadError); continue; }
      const { data, error } = await supabase.from('files').insert({
        owner_type: ownerType, owner_id: ownerId, storage_path: path, name: file.name, size: file.size, category, modified_by: user?.id,
      }).select('*, profiles(full_name)').single();
      if (error) { console.error('שגיאה בשמירת פרטי קובץ:', error); continue; }
      uploaded.push(data);
    }
    if (uploaded.length) setFiles(prev => [...uploaded, ...prev]);
    return uploaded;
  }

  async function recategorizeFile(id, category) {
    const { data, error } = await supabase.from('files').update({ category }).eq('id', id).select('*, profiles(full_name)').single();
    if (error) { console.error('שגיאה בעדכון קטגוריית קובץ:', error); return null; }
    setFiles(prev => prev.map(f => (f.id === id ? data : f)));
    return data;
  }

  async function deleteFile(f) {
    await supabase.storage.from(BUCKET).remove([f.storage_path]);
    const { error } = await supabase.from('files').delete().eq('id', f.id);
    if (error) { console.error('שגיאה במחיקת קובץ:', error); return; }
    setFiles(prev => prev.filter(x => x.id !== f.id));
  }

  async function getDownloadUrl(f) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(f.storage_path, 60);
    if (error) { console.error('שגיאה ביצירת קישור הורדה:', error); return null; }
    return data.signedUrl;
  }

  return { files, loading, uploadFiles, recategorizeFile, deleteFile, getDownloadUrl };
}
