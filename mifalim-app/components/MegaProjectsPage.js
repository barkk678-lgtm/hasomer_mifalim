'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Layers } from 'lucide-react';
import { useMegaProjects } from '../lib/useMegaProjects';
import { C } from '../lib/designSystem';
import { Field, TextInput, IconButton, Card, Modal } from './ui';

function CreateMegaModal({ open, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await onCreate({ name: name.trim() });
    setSaving(false);
    setName('');
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="יצירת פרויקט על"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ color: C.inkSoft }}>ביטול</button>
          <button disabled={saving || !name.trim()} onClick={handleSave} className="px-5 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: C.forest, opacity: saving || !name.trim() ? 0.6 : 1 }}>
            {saving ? 'שומר...' : 'יצירה'}
          </button>
        </>
      }
    >
      <Field label="שם פרויקט העל">
        <TextInput value={name} onChange={e => setName(e.target.value)} placeholder='לדוגמה: פרויקט על - קיץ תשפ"ז' />
      </Field>
    </Modal>
  );
}

export default function MegaProjectsPage() {
  const { megaProjects, loading, createMegaProject, deleteMegaProject } = useMegaProjects();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Rubik, sans-serif', color: C.forestDark }}>פרויקטי על</h1>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{ background: C.forest }}>
          <Plus size={16} /> יצירת פרויקט על
        </button>
      </div>

      <CreateMegaModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={createMegaProject} />

      {loading ? (
        <p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p>
      ) : megaProjects.length === 0 ? (
        <div className="text-center py-20 rounded-xl" style={{ background: C.surface, border: `1px dashed ${C.line}`, color: C.inkSoft }}>
          <Layers size={28} className="mx-auto mb-3" style={{ color: C.sage }} />
          אין עדיין פרויקטי על
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {megaProjects.map(mp => (
            <div key={mp.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              <Link href={`/mega/${mp.id}`} className="font-semibold hover:underline" style={{ color: C.forestDark }}>{mp.name}</Link>
              <IconButton icon={Trash2} tone="danger" onClick={() => { if (confirm(`למחוק את "${mp.name}"?`)) deleteMegaProject(mp.id); }} title="מחיקה" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
