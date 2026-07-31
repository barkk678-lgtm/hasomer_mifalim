'use client';
import { useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { useTasks } from '../lib/useTasks';
import { useMifalim } from '../lib/useMifalim';
import { C } from '../lib/designSystem';
import { Field, TextInput, Select, IconButton, Card, Modal } from './ui';

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((new Date(dateStr) - today) / 86400000);
}

function taskUrgency(t) {
  if (t.is_completed) return 'done';
  const d = daysUntil(t.deadline);
  if (d === null) return 'normal';
  if (d < 0) return 'overdue';
  if (d <= 2) return 'soon';
  return 'normal';
}

const URGENCY_STYLE = {
  overdue: { bg: C.rustSoft, border: C.rust },
  soon: { bg: C.amberSoft, border: C.amber },
  done: { bg: C.greenGoodSoft, border: C.greenGood },
  normal: { bg: C.surface, border: C.line },
};

function emptyDraft(mifalim) {
  return { mifal_id: mifalim[0]?.id || '', task_name: '', assigned_to: '', deadline: '' };
}

function CreateTaskModal({ open, onClose, mifalim, onCreate }) {
  const [draft, setDraft] = useState(emptyDraft(mifalim));
  const [saving, setSaving] = useState(false);

  function set(patch) { setDraft(d => ({ ...d, ...patch })); }

  async function handleSave() {
    if (!draft.task_name.trim() || !draft.mifal_id) return;
    setSaving(true);
    await onCreate({ ...draft, is_completed: false });
    setSaving(false);
    setDraft(emptyDraft(mifalim));
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="יצירת משימה חדשה"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ color: C.inkSoft }}>ביטול</button>
          <button disabled={saving || !draft.task_name.trim() || !draft.mifal_id} onClick={handleSave} className="px-5 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: C.forest, opacity: saving || !draft.task_name.trim() ? 0.6 : 1 }}>
            {saving ? 'שומר...' : 'יצירה'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="שיוך למפעל">
          <Select value={draft.mifal_id} onChange={e => set({ mifal_id: e.target.value })}>
            {mifalim.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        </Field>
        <Field label="שם המשימה">
          <TextInput value={draft.task_name} onChange={e => set({ task_name: e.target.value })} />
        </Field>
        <Field label="אחראי">
          <TextInput value={draft.assigned_to} onChange={e => set({ assigned_to: e.target.value })} />
        </Field>
        <Field label="תאריך יעד">
          <TextInput type="date" value={draft.deadline} onChange={e => set({ deadline: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

export default function TasksPage() {
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks();
  const { mifalim, loading: mifalimLoading } = useMifalim();
  const [createOpen, setCreateOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? tasks : tasks.filter(t => !t.is_completed);
  const openCount = tasks.filter(t => !t.is_completed).length;
  const overdueCount = tasks.filter(t => taskUrgency(t) === 'overdue').length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Rubik, sans-serif', color: C.forestDark }}>משימות מכלל המפעלים</h1>

      {!mifalimLoading && <CreateTaskModal open={createOpen} onClose={() => setCreateOpen(false)} mifalim={mifalim} onCreate={createTask} />}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="rounded-xl p-3.5 text-center" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="text-lg font-bold" style={{ color: C.forestDark }}>{openCount}</div>
          <div className="text-[11px] font-semibold mt-1" style={{ color: C.inkSoft }}>משימות פתוחות</div>
        </div>
        <div className="rounded-xl p-3.5 text-center" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <div className="text-lg font-bold" style={{ color: C.rust }}>{overdueCount}</div>
          <div className="text-[11px] font-semibold mt-1" style={{ color: C.inkSoft }}>משימות בחריגה</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setCreateOpen(true)} disabled={mifalim.length === 0} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: C.forest, opacity: mifalim.length === 0 ? 0.6 : 1 }}>
          <Plus size={16} /> יצירת משימה חדשה
        </button>
        <button onClick={() => setShowAll(s => !s)} className="px-3 py-2 rounded-lg text-xs font-semibold" style={{ background: C.ochreSoft, color: '#6B4C16' }}>
          {showAll ? 'הצג משימות פתוחות בלבד' : 'הצג את כל המשימות'}
        </button>
      </div>
      {mifalim.length === 0 && <p className="text-xs mb-2" style={{ color: C.inkSoft }}>צריך קודם ליצור מפעל אחד לפחות ב"כל המפעלים" כדי לשייך אליו משימות.</p>}

      <Card>
        {loading ? (
          <p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={{ background: C.paper, border: `1px dashed ${C.line}`, color: C.inkSoft }}>אין משימות להצגה</div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: '#E3E4D6' }}>
                {['משימה', 'מפעל', 'אחראי', 'תאריך יעד', 'סטטוס', ''].map(h => (
                  <th key={h} className="text-right px-4 py-2 text-xs font-semibold" style={{ color: C.forestDark }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(t => {
                const u = URGENCY_STYLE[taskUrgency(t)];
                return (
                  <tr key={t.id} style={{ background: u.bg, borderTop: `1px solid ${u.border}` }}>
                    <td className="px-4 py-2.5" style={{ color: C.ink }}>{t.task_name}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: C.inkSoft }}>{t.mifalim?.name || '—'}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: C.inkSoft }}>{t.assigned_to || '—'}</td>
                    <td className="px-4 py-2.5 text-xs">{formatDate(t.deadline)}</td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => updateTask(t.id, { is_completed: !t.is_completed })}
                        className="px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={t.is_completed ? { background: C.greenGoodSoft, color: C.greenGood, border: `1.5px solid ${C.ink}` } : { background: C.rustSoft, color: C.rust, border: `1.5px solid ${C.ink}` }}
                      >
                        {t.is_completed ? 'הושלם' : 'פתוח'}
                      </button>
                    </td>
                    <td className="px-2 py-2.5 text-center"><IconButton icon={Trash2} tone="danger" onClick={() => deleteTask(t.id)} title="מחיקה" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
