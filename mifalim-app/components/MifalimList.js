'use client';
import { useState } from 'react';
import { Plus, Trash2, Compass, Tent, Users, Wrench } from 'lucide-react';
import { useMifalim } from '../lib/useMifalim';
import { C, NUMFONT, STATUS_OPTIONS, STATUS_TONE } from '../lib/designSystem';
import { Field, TextInput, Select, Badge, IconButton, Card, Modal } from './ui';

const ALL_TYPES = {
  day_trip: { label: 'טיול חד יומי', icon: Compass },
  multi_day: { label: 'טיול רב יומי / מחנה', icon: Tent },
  seminar: { label: 'סמינר', icon: Users },
  preparation: { label: 'הכנת מדריכים', icon: Wrench },
};

function emptyDraft() {
  return { name: '', type: 'day_trip', lead_role: '', status: 'מתוכנן' };
}

function CreateMifalModal({ open, onClose, onCreate }) {
  const [draft, setDraft] = useState(emptyDraft());
  const [saving, setSaving] = useState(false);

  function set(patch) { setDraft(d => ({ ...d, ...patch })); }

  async function handleSave() {
    if (!draft.name.trim()) return;
    setSaving(true);
    await onCreate(draft);
    setSaving(false);
    setDraft(emptyDraft());
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="יצירת מפעל חדש"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ color: C.inkSoft }}>ביטול</button>
          <button disabled={saving || !draft.name.trim()} onClick={handleSave} className="px-5 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: C.forest, opacity: saving || !draft.name.trim() ? 0.6 : 1 }}>
            {saving ? 'שומר...' : 'יצירה'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="שם המפעל">
          <TextInput value={draft.name} onChange={e => set({ name: e.target.value })} placeholder="לדוגמה: מחנה קיץ שכבת ז'" />
        </Field>
        <Field label="סוג מפעל">
          <Select value={draft.type} onChange={e => set({ type: e.target.value })}>
            {Object.entries(ALL_TYPES).map(([key, def]) => <option key={key} value={key}>{def.label}</option>)}
          </Select>
        </Field>
        <Field label="בעל תפקיד אחראי">
          <TextInput value={draft.lead_role} onChange={e => set({ lead_role: e.target.value })} placeholder="לדוגמה: ר' תחום טיילנות" />
        </Field>
        <Field label="סטטוס">
          <Select value={draft.status} onChange={e => set({ status: e.target.value })}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

export default function MifalimList() {
  const { mifalim, loading, createMifal, deleteMifal } = useMifalim();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <CreateMifalModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={createMifal} />

      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: C.forest }}>
          <Plus size={16} /> יצירת מפעל חדש
        </button>
      </div>

      <Card title="כל המפעלים (נתונים אמיתיים מ-Supabase)">
        {loading ? (
          <p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p>
        ) : mifalim.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={{ background: C.paper, border: `1px dashed ${C.line}`, color: C.inkSoft }}>
            <Tent size={28} className="mx-auto mb-3" style={{ color: C.sage }} />
            אין עדיין מפעלים — תלחצו על "יצירת מפעל חדש" למעלה
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: C.forest }}>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-white">שם המפעל</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-white">סוג</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-white">אחראי</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-white">סטטוס</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {mifalim.map((m, i) => {
                  const def = ALL_TYPES[m.type] || {};
                  const Icon = def.icon || Tent;
                  return (
                    <tr key={m.id} style={{ background: i % 2 ? '#FAFAF3' : C.surface, borderTop: `1px solid ${C.line}` }}>
                      <td className="px-4 py-3 font-semibold" style={{ color: C.forestDark }}>{m.name || 'מפעל ללא שם'}</td>
                      <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-xs" style={{ color: C.inkSoft }}><Icon size={13} />{def.label || m.type}</span></td>
                      <td className="px-4 py-3 text-xs" style={{ color: C.inkSoft }}>{m.lead_role || '—'}</td>
                      <td className="px-4 py-3"><Badge tone={STATUS_TONE[m.status] || 'forest'}>{m.status}</Badge></td>
                      <td className="px-2 py-3 text-center">
                        <IconButton icon={Trash2} tone="danger" title="מחיקת מפעל" onClick={() => { if (confirm(`למחוק את "${m.name || 'המפעל'}"?`)) deleteMifal(m.id); }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
