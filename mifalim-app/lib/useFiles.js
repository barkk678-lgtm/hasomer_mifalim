'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from './supabaseClient';

const BUCKET = 'mifal-files';

// Shared by mifal files and mega-project files — same owner_type/owner_id pattern as useBudget.js.
export function useFiles(ownerType, ownerId) {
  const supabase = createClient();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadError, setUploadError] = useState('');

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
    const files = Array.from(fileList || []);
    if (!files.length) return [];
    const uploaded = [];
    setUploadError('');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) { setUploadError(`שגיאת התחברות: ${authError.message}`); return []; }
      for (const file of files) {
        // Supabase Storage rejects object keys with non-ASCII characters (e.g. Hebrew names) —
        // "Invalid key". The display name (Hebrew and all) already lives in files.name below, so
        // the storage key itself doesn't need to reflect the original filename at all: build it
        // from only a timestamp + random id + the (ASCII-sanitized) extension.
        const dotIdx = file.name.lastIndexOf('.');
        const ext = (dotIdx > 0 ? file.name.slice(dotIdx) : '').replace(/[^a-zA-Z0-9.]/g, '');
        const randomId = Math.random().toString(36).slice(2, 10);
        const path = `${ownerType}/${ownerId}/${Date.now()}_${randomId}${ext}`;
        const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
        if (uploadErr) { console.error('שגיאה בהעלאת קובץ:', uploadErr); setUploadError(`שגיאה בהעלאת "${file.name}": ${uploadErr.message}`); continue; }
        const { data, error } = await supabase.from('files').insert({
          owner_type: ownerType, owner_id: ownerId, storage_path: path, name: file.name, size: file.size, category, modified_by: user?.id,
        }).select('*, profiles(full_name)').single();
        if (error) { console.error('שגיאה בשמירת פרטי קובץ:', error); setUploadError(`שגיאה בשמירת "${file.name}": ${error.message}`); continue; }
        uploaded.push(data);
      }
    } catch (err) {
      console.error('שגיאה בלתי צפויה בהעלאת קבצים:', err);
      setUploadError(`שגיאה בלתי צפויה: ${err.message || err}`);
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

  return { files, loading, uploadFiles, recategorizeFile, deleteFile, getDownloadUrl, uploadError };
}
