'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Pencil, ChevronDown } from 'lucide-react';
import { useTasks } from '../lib/useTasks';
import { useMifalim } from '../lib/useMifalim';
import { useStakeholders } from '../lib/useStakeholders';
import { C, ACTIVE_STATUSES } from '../lib/designSystem';
import { Field, TextInput, TextArea, Select, IconButton, Card, Modal, StatusBadge, ExportButton } from './ui';

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

function isSingleDateType(m) { return m.type === 'day_trip' || (m.type === 'preparation' && m.prep_date_mode === 'single'); }
function getRelevantDates(m) {
  if (isSingleDateType(m)) { const d = m.date_mode === 'backup' ? m.backup_date : m.event_date; return { start: d, end: d }; }
  const start = m.date_mode === 'backup' ? m.backup_start_date : m.start_date;
  const end = m.date_mode === 'backup' ? m.backup_end_date : m.end_date;
  return { start, end };
}
function effectiveStatus(m) {
  if (m.status === 'בוטל' || m.status === 'הסתיים') return m.status;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const { end } = getRelevantDates(m);
  if (end) { const endD = new Date(end); if (today > endD) return 'ממתין להפקת לקחים'; }
  if (m.work_start_date) { const wsd = new Date(m.work_start_date); if (today >= wsd) return 'בעבודה'; }
  return m.status || 'מתוכנן';
}

function StatCard({ label, value, tone }) {
  return (
    <div className="rounded-xl p-3.5 text-center" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
      <div className="text-lg font-bold" style={{ color: tone === 'rust' ? C.rust : C.forestDark }}>{value}</div>
      <div className="text-[11px] font-semibold mt-1" style={{ color: C.inkSoft }}>{label}</div>
    </div>
  );
}

function TaskFormModal({ open, onClose, activeMifalim, editing, onCreate, onUpdate }) {
  const [mifalId, setMifalId] = useState('');
  const [taskName, setTaskName] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);
  const { stakeholders } = useStakeholders(mifalId);

  useEffect(() => {
    if (open) {
      if (editing) { setMifalId(editing.mifal_id); setTaskName(editing.task_name || ''); setAssignedTo(editing.assigned_to || ''); setDeadline(editing.deadline || ''); setComments(editing.comments || ''); }
      else { setMifalId(activeMifalim[0]?.id || ''); setTaskName(''); setAssignedTo(''); setDeadline(''); setComments(''); }
    }
  }, [open, editing]);

  async function save() {
    if (!mifalId || !taskName.trim()) return;
    setSaving(true);
    if (editing) await onUpdate(editing.id, { mifal_id: mifalId, task_name: taskName, assigned_to: assignedTo, deadline: deadline || null, comments });
    else await onCreate({ mifal_id: mifalId, task_name: taskName, assigned_to: assignedTo, deadline: deadline || null, comments, is_completed: false });
    setSaving(false);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'עריכת משימה' : 'יצירת משימה חדשה'}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ color: C.inkSoft }}>ביטול</button>
          <button disabled={saving || !mifalId || !taskName.trim()} onClick={save} className="px-5 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: C.forest, opacity: saving || !mifalId || !taskName.trim() ? 0.6 : 1 }}>
            {saving ? 'שומר...' : editing ? 'שמירה' : 'יצירה'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="שיוך למפעל">
          <Select value={mifalId} onChange={e => setMifalId(e.target.value)}>
            {activeMifalim.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        </Field>
        <Field label="שם המשימה"><TextInput value={taskName} onChange={e => setTaskName(e.target.value)} /></Field>
        <Field label="אחראי">
          {stakeholders.length > 0 ? (
            <Select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
              <option value="">לא משויך</option>
              {stakeholders.map(s => <option key={s.id} value={s.full_name}>{s.full_name}</option>)}
            </Select>
          ) : (
            <TextInput value={assignedTo} onChange={e => setAssignedTo(e.target.value)} />
          )}
        </Field>
        <Field label="תאריך יעד"><TextInput type="date" value={deadline} onChange={e => setDeadline(e.target.value)} /></Field>
        <Field label="הערות"><TextArea value={comments} onChange={e => setComments(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

export default function TasksPage() {
  const router = useRouter();
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks();
  const { mifalim, loading: mifalimLoading } = useMifalim();
  const [statusFilter, setStatusFilter] = useState('open');
  const [expanded, setExpanded] = useState({});
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const activeMifalim = mifalim.filter(m => ACTIVE_STATUSES.includes(effectiveStatus(m)));
  const activeIds = new Set(activeMifalim.map(m => m.id));

  const groups = activeMifalim.map(m => {
    const mifalTasks = tasks.filter(t => t.mifal_id === m.id);
    const shown = statusFilter === 'open' ? mifalTasks.filter(t => !t.is_completed) : mifalTasks;
    return { mifal: m, tasks: shown };
  }).filter(g => g.tasks.length > 0 || statusFilter === 'all');

  const visibleTasksFlat = groups.flatMap(g => g.tasks);
  const openCount = tasks.filter(t => activeIds.has(t.mifal_id) && !t.is_completed).length;
  const overdueCount = tasks.filter(t => activeIds.has(t.mifal_id) && taskUrgency(t) === 'overdue').length;

  function toggleExpand(id) { setExpanded(e => ({ ...e, [id]: e[id] === false ? true : false })); }
  function isExpanded(id) { return expanded[id] !== false; }

  const exportRows = [];
  groups.forEach(g => g.tasks.forEach(t => exportRows.push({ ...t, mifalName: g.mifal.name })));

  const loadingAny = loading || mifalimLoading;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Rubik, sans-serif', color: C.forestDark }}>משימות מכלל המפעלים</h1>

      {!mifalimLoading && (
        <>
          <TaskFormModal open={createOpen} onClose={() => setCreateOpen(false)} activeMifalim={activeMifalim} editing={null} onCreate={createTask} onUpdate={updateTask} />
          <TaskFormModal open={!!editingTask} onClose={() => setEditingTask(null)} activeMifalim={activeMifalim} editing={editingTask} onCreate={createTask} onUpdate={updateTask} />
        </>
      )}

      <div className="flex justify-end mb-2">
        <button onClick={() => setStatusFilter(f => (f === 'open' ? 'all' : 'open'))} className="px-3 py-2 rounded-lg text-xs font-semibold" style={{ background: C.ochreSoft, color: '#6B4C16' }}>
          {statusFilter === 'open' ? 'הצג את כל המשימות הפעילות' : 'הצג משימות פתוחות בלבד'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatCard label="כמות מפעלים פעילים" value={groups.length} />
        <StatCard label="כמות משימות פתוחות" value={openCount} />
        <StatCard label="כמות משימות בחריגה" value={overdueCount} tone="rust" />
      </div>

      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setCreateOpen(true)} disabled={activeMifalim.length === 0} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: C.forest, opacity: activeMifalim.length === 0 ? 0.6 : 1 }}>
          <Plus size={16} /> יצירת משימה חדשה
        </button>
        {exportRows.length > 0 && (
          <ExportButton
            rows={exportRows}
            filename="משימות.xlsx"
            columns={[
              { key: 'mifalName', label: 'מפעל' },
              { key: 'task_name', label: 'משימה' },
              { key: 'assigned_to', label: 'אחראי' },
              { key: 'deadline', label: 'תאריך יעד', value: t => formatDate(t.deadline) },
              { key: 'is_completed', label: 'סטטוס', value: t => (t.is_completed ? 'הושלם' : 'פתוח') },
            ]}
          />
        )}
      </div>
      {activeMifalim.length === 0 && !mifalimLoading && <p className="text-xs mb-2" style={{ color: C.inkSoft }}>אין כרגע מפעלים פעילים לשייך אליהם משימות.</p>}

      {loadingAny ? (
        <Card><p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p></Card>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ background: C.surface, border: `1px dashed ${C.line}`, color: C.inkSoft }}>אין משימות להצגה</div>
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map(g => {
            const open = isExpanded(g.mifal.id);
            return (
              <div key={g.mifal.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
                <div className="flex items-center justify-between px-4 py-2.5 cursor-pointer" style={{ background: '#E3E4D6' }} onClick={() => toggleExpand(g.mifal.id)}>
                  <div className="flex items-center gap-2">
                    <ChevronDown size={14} style={{ transform: open ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.15s', color: C.forestDark }} />
                    <button onClick={e => { e.stopPropagation(); router.push(`/mifal/${g.mifal.id}`); }} className="text-sm font-bold hover:underline" style={{ color: C.forestDark }}>{g.mifal.name}</button>
                    <span className="text-xs" style={{ color: C.inkSoft }}>({g.tasks.length} משימות)</span>
                  </div>
                  <StatusBadge status={effectiveStatus(g.mifal)} />
                </div>
                {open && (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr style={{ background: '#EDEEE0' }}>
                        {['', 'משימה', 'אחראי', 'תאריך יעד', 'סטטוס', ''].map((h, hi) => (
                          <th key={hi} className="text-right px-4 py-2 text-xs font-semibold" style={{ color: C.forestDark }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {g.tasks.map(t => {
                        const u = URGENCY_STYLE[taskUrgency(t)];
                        return (
                          <tr key={t.id} style={{ background: u.bg, borderTop: `1px solid ${u.border}` }}>
                            <td className="px-2 py-2.5 text-center"><IconButton icon={Pencil} onClick={() => setEditingTask(t)} title="עריכה" /></td>
                            <td className="px-4 py-2.5" style={{ whiteSpace: 'normal', wordBreak: 'break-word', color: C.ink }}>{t.task_name}</td>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
