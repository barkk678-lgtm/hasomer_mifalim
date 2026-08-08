'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Plus, Trash2, Pencil, ListChecks, Wallet, UserPlus, LayoutGrid, TableIcon, CalendarDays, Upload, Wrench, Bus, FileText, FileSpreadsheet, Image as ImageIcon, File as FileIcon, ChevronRight, ChevronLeft } from 'lucide-react';
import { MifalModal, MifalForm, createEmptyDraft, MifalStatusControl } from './MifalimList';
import BusLogisticsTab from './BusLogisticsTab';
import { useMifal } from '../lib/useMifal';
import { useMifalTasks } from '../lib/useMifalTasks';
import { useBudget } from '../lib/useBudget';
import { useSuppliers } from '../lib/useSuppliers';
import { useStakeholders } from '../lib/useStakeholders';
import { usePricingTiers } from '../lib/usePricingTiers';
import { useOccurrences } from '../lib/useOccurrences';
import { useFiles } from '../lib/useFiles';
import { usePreparations } from '../lib/usePreparations';
import { C, ALL_TYPES, REQUIRED_FILE_CATEGORIES, GENERAL_FILE_CATEGORIES, EXPENSE_TYPES } from '../lib/designSystem';
import { InfoField, StatusBadge, TextInput, IconButton, Card, Modal, InlineGrid, ExportButton } from './ui';
import CrossFilterDonutChart from './CrossFilterDonutChart';

const UNASSIGNED = '__unassigned__';

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function money(n) {
  return (Number(n) || 0).toLocaleString('he-IL', { maximumFractionDigits: 0 }) + ' ₪';
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

function dateRangeLabel(m) {
  const single = m.type === 'day_trip' || (m.type === 'preparation' && m.prep_date_mode === 'single');
  const start = m.date_mode === 'backup' ? (single ? m.backup_date : m.backup_start_date) : (single ? m.event_date : m.start_date);
  const end = single ? start : (m.date_mode === 'backup' ? m.backup_end_date : m.end_date);
  if (!start) return '—';
  return single ? formatDate(start) : `${formatDate(start) || '?'}-${formatDate(end) || '?'}`;
}

/* ============================== STAKEHOLDERS ============================== */
function StakeholdersModal({ open, onClose, stakeholders, onCreate, onDelete }) {
  const [role, setRole] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  async function handleAdd(e) {
    e.preventDefault();
    if (!fullName.trim()) return;
    await onCreate({ role: role.trim(), full_name: fullName.trim(), email: email.trim() });
    setRole(''); setFullName(''); setEmail('');
  }

  return (
    <Modal open={open} onClose={onClose} title="בעלי התפקידים במפעל" footer={<button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: C.forest }}>סגירה</button>}>
      <form onSubmit={handleAdd} className="flex flex-wrap gap-2 mb-4">
        <TextInput value={role} onChange={e => setRole(e.target.value)} placeholder="תפקיד" className="w-32" />
        <TextInput value={fullName} onChange={e => setFullName(e.target.value)} placeholder="שם מלא" className="flex-1 min-w-[120px]" />
        <TextInput value={email} onChange={e => setEmail(e.target.value)} placeholder="מייל" className="w-40" />
        <button type="submit" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: C.forest }}><Plus size={15} /> הוספה</button>
      </form>
      {stakeholders.length === 0 ? (
        <p className="text-sm" style={{ color: C.inkSoft }}>אין עדיין בעלי תפקידים.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {stakeholders.map(s => (
            <div key={s.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ border: `1px solid ${C.line}` }}>
              <span className="text-sm" style={{ color: C.ink }}>{s.role ? <strong>{s.role}</strong> : null}{s.role ? ' — ' : ''}{s.full_name} {s.email ? `(${s.email})` : ''}</span>
              <IconButton icon={Trash2} tone="danger" onClick={() => onDelete(s.id)} title="מחיקה" />
            </div>
          ))}
        </div>
      )}
      <p className="text-xs mt-3" style={{ color: C.inkSoft }}>כל בעל תפקיד שנוסף כאן הופך אוטומטית למסלול בלוח הקנבן של המשימות.</p>
    </Modal>
  );
}

/* ============================== TASKS TAB (kanban + table) ============================== */
function TaskCard({ task, onUpdate, onDelete }) {
  const [name, setName] = useState(task.task_name);
  const [comments, setComments] = useState(task.comments || '');
  const [deadline, setDeadline] = useState(task.deadline || '');
  const u = URGENCY_STYLE[taskUrgency(task)];

  return (
    <div draggable onDragStart={e => e.dataTransfer.setData('text/plain', task.id)} className="rounded-lg p-2.5 shadow-sm cursor-grab relative" style={{ background: u.bg, border: `1px solid ${u.border}` }}>
      <button onClick={() => onDelete(task.id)} className="absolute top-1.5 left-1.5" style={{ color: C.inkSoft }}><Trash2 size={12} /></button>
      <input
        value={name} onChange={e => setName(e.target.value)}
        onBlur={() => { if (name !== task.task_name) onUpdate(task.id, { task_name: name }); }}
        className="w-full text-sm font-semibold bg-transparent outline-none mb-1 pl-4"
      />
      <input
        value={comments} onChange={e => setComments(e.target.value)}
        onBlur={() => { if (comments !== (task.comments || '')) onUpdate(task.id, { comments }); }}
        placeholder="הערות" className="w-full text-[11px] bg-transparent outline-none mb-1" style={{ color: C.inkSoft }}
      />
      <div className="flex items-center justify-between">
        <input
          type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
          onBlur={() => { if (deadline !== (task.deadline || '')) onUpdate(task.id, { deadline: deadline || null }); }}
          className="text-[11px] bg-transparent outline-none"
        />
        <button onClick={() => onUpdate(task.id, { is_completed: !task.is_completed })} className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={task.is_completed ? { background: C.greenGood, color: '#fff' } : { background: '#fff', color: C.inkSoft, border: `1px solid ${C.line}` }}>
          {task.is_completed ? 'הושלם' : 'פתוח'}
        </button>
      </div>
    </div>
  );
}

function TasksTab({ mifalId }) {
  const { tasks, loading, createTask, updateTask, deleteTask } = useMifalTasks(mifalId);
  const { stakeholders, createStakeholder, deleteStakeholder } = useStakeholders(mifalId);
  const [layout, setLayout] = useState('kanban');
  const [showAll, setShowAll] = useState(false);
  const [stakeholdersOpen, setStakeholdersOpen] = useState(false);
  const [dragOverLane, setDragOverLane] = useState(null);

  const visible = showAll ? tasks : tasks.filter(t => !t.is_completed);
  const lanes = [...stakeholders.map(s => ({ id: s.full_name, label: s.full_name || 'ללא שם' })), { id: UNASSIGNED, label: 'לא משויך' }];

  function moveTask(taskId, laneId) {
    updateTask(taskId, { assigned_to: laneId === UNASSIGNED ? '' : laneId });
  }
  function addTaskToLane(laneId) {
    createTask({ task_name: '', assigned_to: laneId === UNASSIGNED ? '' : laneId, deadline: null, comments: '', is_completed: false });
  }

  const taskColumns = [
    { key: 'task_name', label: 'משימה', type: 'text' },
    stakeholders.length > 0
      ? { key: 'assigned_to', label: 'אחראי', type: 'select', options: stakeholders.map(s => s.full_name) }
      : { key: 'assigned_to', label: 'אחראי', type: 'text' },
    { key: 'deadline', label: 'תאריך יעד', type: 'date' },
    { key: 'comments', label: 'הערות', type: 'text' },
    { key: 'is_completed', label: 'סטטוס', type: 'boolean' },
  ];
  function emptyTaskDraft() { return { task_name: '', assigned_to: '', deadline: '', comments: '', is_completed: false }; }

  return (
    <div>
      <StakeholdersModal open={stakeholdersOpen} onClose={() => setStakeholdersOpen(false)} stakeholders={stakeholders} onCreate={createStakeholder} onDelete={deleteStakeholder} />

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <button onClick={() => setStakeholdersOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: C.forest, color: '#fff' }}>
          <UserPlus size={13} /> בעלי התפקידים במפעל ({stakeholders.length})
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAll(s => !s)} className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: C.ochreSoft, color: '#6B4C16' }}>
            {showAll ? 'הצג משימות פתוחות בלבד' : 'הצג את כל המשימות'}
          </button>
          <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
            <button onClick={() => setLayout('kanban')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold" style={layout === 'kanban' ? { background: C.forest, color: '#fff' } : { background: C.surface, color: C.inkSoft }}><LayoutGrid size={13} /> קנבן</button>
            <button onClick={() => setLayout('table')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold" style={layout === 'table' ? { background: C.forest, color: '#fff' } : { background: C.surface, color: C.inkSoft }}><TableIcon size={13} /> טבלה</button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p>
      ) : layout === 'kanban' ? (
        stakeholders.length === 0 ? (
          <div className="text-center py-10 rounded-xl text-sm" style={{ background: C.paper, color: C.inkSoft, border: `1px dashed ${C.line}` }}>
            הוסיפו בעלי תפקידים כדי לפתוח את לוח הקנבן — כל בעל תפקיד הופך למסלול.
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {lanes.map(lane => {
              const laneTasks = visible.filter(t => (t.assigned_to || '') === (lane.id === UNASSIGNED ? '' : lane.id));
              return (
                <div
                  key={lane.id}
                  onDragOver={e => { e.preventDefault(); setDragOverLane(lane.id); }}
                  onDragLeave={() => setDragOverLane(null)}
                  onDrop={e => { e.preventDefault(); moveTask(e.dataTransfer.getData('text/plain'), lane.id); setDragOverLane(null); }}
                  className="w-64 shrink-0 rounded-xl p-2.5"
                  style={{ background: dragOverLane === lane.id ? '#F5EEDC' : C.paper, border: `1px solid ${C.line}` }}
                >
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs font-bold" style={{ color: C.forestDark }}>{lane.label} <span className="font-normal" style={{ color: C.inkSoft }}>({laneTasks.length})</span></span>
                    <button onClick={() => addTaskToLane(lane.id)} title="הוסף משימה"><Plus size={14} style={{ color: C.forestLight }} /></button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {laneTasks.map(t => <TaskCard key={t.id} task={t} onUpdate={updateTask} onDelete={deleteTask} />)}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <Card>
          <InlineGrid
            columns={taskColumns}
            rows={visible}
            makeEmptyDraft={emptyTaskDraft}
            onCreate={createTask}
            onUpdate={updateTask}
            onDelete={deleteTask}
          />
        </Card>
      )}
      <div className="flex flex-wrap gap-3 mt-3 text-[11px]" style={{ color: C.inkSoft }}>
        <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: C.rust }} />חריגת דד-ליין</span>
        <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: C.amber }} />יעד תוך יומיים</span>
        <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: C.greenGood }} />הושלם</span>
      </div>
    </div>
  );
}

/* ============================== OCCURRENCES TAB ============================== */
const OCCURRENCE_COLUMNS = [
  { key: 'name', label: 'שם המופע', type: 'text' },
  { key: 'start_date', label: 'תאריך התחלה', type: 'date' },
  { key: 'end_date', label: 'תאריך סיום', type: 'date' },
  { key: 'notes', label: 'הערות', type: 'text' },
];
function emptyOccurrenceDraft() { return { name: '', start_date: '', end_date: '', notes: '' }; }

function PrepQuickCreateModal({ open, onClose, parentMifal, onCreate }) {
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && parentMifal) {
      setDraft({
        ...createEmptyDraft('preparation'),
        lead_role: parentMifal.lead_role || '',
        target_municipalities: parentMifal.target_municipalities || [],
        work_start_date: parentMifal.work_start_date || '',
      });
    }
  }, [open, parentMifal]);

  async function handleSave() {
    if (!draft?.name?.trim()) return;
    setSaving(true);
    await onCreate(draft);
    setSaving(false);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`יצירת הכנת מדריכים עבור "${parentMifal?.name || ''}"`}
      footer={draft ? (
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ color: C.inkSoft }}>ביטול</button>
          <button disabled={saving || !draft.name.trim()} onClick={handleSave} className="px-5 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: C.forest, opacity: saving || !draft.name.trim() ? 0.6 : 1 }}>
            {saving ? 'שומר...' : 'יצירה'}
          </button>
        </>
      ) : null}
    >
      {draft && <MifalForm draft={draft} setDraft={setDraft} />}
    </Modal>
  );
}

function OccurrencesTab({ mifal }) {
  const { occurrences, loading, createOccurrence, updateOccurrence, deleteOccurrence } = useOccurrences(mifal.id);
  const { preparations, loading: prepsLoading, createPreparation } = usePreparations(mifal.id);
  const [prepModalOpen, setPrepModalOpen] = useState(false);

  return (
    <div>
      <PrepQuickCreateModal open={prepModalOpen} onClose={() => setPrepModalOpen(false)} parentMifal={mifal} onCreate={createPreparation} />
      <Card title="מופעים">
        {loading ? (
          <p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p>
        ) : (
          <InlineGrid
            columns={OCCURRENCE_COLUMNS}
            rows={occurrences}
            makeEmptyDraft={emptyOccurrenceDraft}
            onCreate={createOccurrence}
            onUpdate={updateOccurrence}
            onDelete={deleteOccurrence}
          />
        )}
      </Card>
      <Card title="הכנות מדריכים משויכות" right={
        <button onClick={() => setPrepModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: C.linkBlue }}>
          <Wrench size={13} /> צור הכנת מדריכים
        </button>
      }>
        {prepsLoading ? (
          <p className="text-xs" style={{ color: C.inkSoft }}>טוען...</p>
        ) : preparations.length === 0 ? (
          <p className="text-xs" style={{ color: C.inkSoft }}>לא נוצרו עדיין רשומות הכנת מדריכים עבור מפעל זה.</p>
        ) : (
          <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
            <table className="w-full text-sm border-collapse">
              <thead><tr style={{ background: '#E3E4D6' }}>{['שם ההכנה', 'תאריכים', 'סטטוס'].map(h => <th key={h} className="text-right px-3 py-2 text-xs font-semibold" style={{ color: C.forestDark }}>{h}</th>)}</tr></thead>
              <tbody>
                {preparations.map((p, i) => (
                  <tr key={p.id} style={{ background: i % 2 ? '#FAFAF3' : C.surface, borderTop: `1px solid ${C.line}` }}>
                    <td className="px-3 py-2"><Link href={`/mifal/${p.id}`} className="font-semibold hover:underline" style={{ color: C.linkBlue }}>{p.name}</Link></td>
                    <td className="px-3 py-2 text-xs" style={{ color: C.ink }}>{dateRangeLabel(p)}</td>
                    <td className="px-3 py-2"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ============================== FILES TAB ============================== */
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
function extOf(name) { const i = (name || '').lastIndexOf('.'); return i > 0 ? name.slice(i + 1).toLowerCase() : ''; }
function fileIconMeta(name) {
  const ext = extOf(name);
  if (IMAGE_EXTENSIONS.includes(ext)) return { Icon: ImageIcon, color: C.steel };
  if (ext === 'pdf') return { Icon: FileText, color: C.rust };
  if (['doc', 'docx'].includes(ext)) return { Icon: FileText, color: C.linkBlue };
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { Icon: FileSpreadsheet, color: C.greenGood };
  return { Icon: FileIcon, color: C.inkSoft };
}
// Every draggable file chip (in any box, required or general) carries just its id — dropped on
// any other box, that box's onDrop resolves it as a move/recategorize rather than a new upload.
function fileDragProps(f) {
  return { draggable: true, onDragStart: e => { e.dataTransfer.setData('text/plain', JSON.stringify({ fileId: f.id })); } };
}
// A drop can be either real OS files (a new upload) or an internal drag payload (moving an
// existing file from another box) — same handler covers both, dispatching by which one it sees.
function handleBoxDrop(e, targetCategory, onUpload, onRecategorize) {
  e.preventDefault();
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) { onUpload(e.dataTransfer.files, targetCategory); return; }
  try {
    const payload = JSON.parse(e.dataTransfer.getData('text/plain'));
    if (payload?.fileId) onRecategorize(payload.fileId, targetCategory);
  } catch { /* not our payload — ignore */ }
}
function uploadedByLine(f) {
  const date = f.modified_at ? new Date(f.modified_at).toLocaleDateString('he-IL') : '';
  return `הועלה ${date}${f.profiles?.full_name ? ` ע"י ${f.profiles.full_name}` : ''}`;
}

// One drag/click drop-zone per required document type — doubles as upload target (OS file drag,
// or dragging a file chip in from another box) and status indicator (red/dashed while empty,
// green once at least one file is tagged with it). Shows one file at a time (big icon/preview +
// upload date/uploader), with paging when more than one file shares the same required type.
function RequiredDocSquare({ docType, files, onUpload, onDownload, onRemove, onRecategorize, getDownloadUrl }) {
  const [dragActive, setDragActive] = useState(false);
  const [idx, setIdx] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const myFiles = files.filter(f => f.category === docType);
  const has = myFiles.length > 0;
  const current = has ? myFiles[Math.min(idx, myFiles.length - 1)] : null;
  const toneColor = has ? C.greenGood : C.rust;
  const toneSoft = has ? C.greenGoodSoft : C.rustSoft;
  const meta = current ? fileIconMeta(current.name) : null;

  useEffect(() => {
    setPreviewUrl(null);
    if (current && IMAGE_EXTENSIONS.includes(extOf(current.name))) getDownloadUrl(current, 3600).then(setPreviewUrl);
  }, [current?.id]);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragActive(false); }}
      onDrop={e => { setDragActive(false); handleBoxDrop(e, docType, onUpload, onRecategorize); }}
      className="rounded-xl p-3 flex flex-col transition-colors"
      style={{ aspectRatio: '1 / 1', border: `2px ${has ? 'solid' : 'dashed'} ${dragActive ? C.ochre : toneColor}`, background: dragActive ? C.ochreSoft : toneSoft }}
    >
      <div className="text-xs font-bold text-center mb-2" style={{ color: toneColor }}>{docType}</div>
      {has ? (
        <div {...fileDragProps(current)} className="flex-1 min-h-0 flex flex-col items-center justify-center gap-1 cursor-grab">
          {previewUrl ? (
            <img src={previewUrl} alt={current.name} className="max-h-16 max-w-full rounded object-contain" />
          ) : (
            <meta.Icon size={40} style={{ color: meta.color }} />
          )}
          <button onClick={() => onDownload(current)} className="text-[10px] font-semibold truncate max-w-full hover:underline" style={{ color: C.forestDark }} title={current.name}>{current.name}</button>
          <div className="text-[9px] text-center" style={{ color: C.inkSoft }}>{uploadedByLine(current)}</div>
          <button onClick={() => onRemove(current)} className="text-[9px] font-semibold" style={{ color: C.rust }}>מחיקה</button>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-[11px] text-center" style={{ color: C.rust }}>גררו קובץ לכאן</div>
      )}
      {myFiles.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-1 text-[10px] font-semibold" style={{ color: C.inkSoft }}>
          <button onClick={() => setIdx(i => (i - 1 + myFiles.length) % myFiles.length)}><ChevronRight size={13} /></button>
          <span>{idx + 1}/{myFiles.length}</span>
          <button onClick={() => setIdx(i => (i + 1) % myFiles.length)}><ChevronLeft size={13} /></button>
        </div>
      )}
      <label className="mt-2 text-[10px] font-semibold text-center py-1.5 rounded cursor-pointer" style={{ background: '#fff', color: C.forestDark, border: `1px solid ${C.line}` }}>
        + הוספת קובץ
        <input type="file" multiple className="hidden" onChange={e => { onUpload(e.target.files, docType); e.target.value = ''; }} />
      </label>
    </div>
  );
}

// General (non-mandatory) files box, one per broad category — same drag-to-tag / drag-to-move
// interaction as the required squares, just listing every file in the category rather than
// paging through one at a time (these can hold many more files than a "one required doc" slot).
function GeneralFileBox({ category, files, onUpload, onDownload, onRemove, onRecategorize }) {
  const [dragActive, setDragActive] = useState(false);
  const rows = files.filter(f => f.category === category);
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragActive(false); }}
      onDrop={e => { setDragActive(false); handleBoxDrop(e, category, onUpload, onRecategorize); }}
      className="rounded-xl p-3 flex flex-col transition-colors"
      style={{ minHeight: 220, border: dragActive ? `2px dashed ${C.ochre}` : `1px solid ${C.line}`, background: dragActive ? C.ochreSoft : C.surface }}
    >
      <div className="text-xs font-bold mb-2 flex items-center justify-between" style={{ color: C.forestDark }}>
        <span>{category}</span>
        <span style={{ color: C.inkSoft }}>({rows.length})</span>
      </div>
      {rows.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[11px] text-center" style={{ color: C.inkSoft }}>גררו קובץ לכאן</div>
      ) : (
        <div className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-y-auto">
          {rows.map(f => {
            const meta = fileIconMeta(f.name);
            return (
              <div key={f.id} {...fileDragProps(f)} className="flex items-center gap-2 text-[11px] rounded-lg px-2 py-1.5 cursor-grab" style={{ background: '#fff', border: `1px solid ${C.line}` }}>
                <meta.Icon size={16} style={{ color: meta.color, flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <button onClick={() => onDownload(f)} className="font-medium truncate block w-full text-right hover:underline" style={{ color: C.forestDark }} title={f.name}>{f.name}</button>
                  <div className="text-[10px]" style={{ color: C.inkSoft }}>{uploadedByLine(f)}</div>
                </div>
                <button onClick={() => onRemove(f)} className="shrink-0"><Trash2 size={12} style={{ color: C.rust }} /></button>
              </div>
            );
          })}
        </div>
      )}
      <label className="mt-2 text-[10px] font-semibold text-center py-1.5 rounded cursor-pointer" style={{ background: '#fff', color: C.forestDark, border: `1px solid ${C.line}` }}>
        + הוספת קובץ
        <input type="file" multiple className="hidden" onChange={e => { onUpload(e.target.files, category); e.target.value = ''; }} />
      </label>
    </div>
  );
}

function FilesTab({ mifalId }) {
  const { files, loading, uploadFiles, recategorizeFile, deleteFile, getDownloadUrl, uploadError } = useFiles('mifal', mifalId);

  async function handleDownload(f) {
    const url = await getDownloadUrl(f);
    if (url) window.open(url, '_blank');
  }

  return (
    <div>
      <h3 className="text-sm font-bold mb-3" style={{ color: C.forestDark }}>מסמכי חובה</h3>
      {uploadError && (
        <div className="rounded-lg px-3 py-2 mb-3 text-xs" style={{ background: C.rustSoft, color: C.rust, border: `1px solid ${C.rust}` }}>
          {uploadError}
        </div>
      )}
      {loading ? <p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p> : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {REQUIRED_FILE_CATEGORIES.map(docType => (
            <RequiredDocSquare key={docType} docType={docType} files={files} onUpload={uploadFiles} onDownload={handleDownload} onRemove={deleteFile} onRecategorize={recategorizeFile} getDownloadUrl={getDownloadUrl} />
          ))}
        </div>
      )}

      <h3 className="text-sm font-bold mb-3" style={{ color: C.forestDark }}>קבצים נוספים</h3>
      <p className="text-[11px] mb-3" style={{ color: C.inkSoft }}>גררו קובץ לתוך אחת התיבות למטה כדי לתייג אותו, או גררו קובץ קיים בין תיבות (כולל מ/אל מסמכי החובה) כדי לשנות את התיוג שלו.</p>
      {loading ? (
        <p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {GENERAL_FILE_CATEGORIES.map(category => (
            <GeneralFileBox key={category} category={category} files={files} onUpload={uploadFiles} onDownload={handleDownload} onRemove={deleteFile} onRecategorize={recategorizeFile} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================== BUDGET TAB (pricing tiers + income + expenses) ============================== */
const TIER_COLUMNS = [
  { key: 'age_group', label: 'קבוצת גיל', type: 'text' },
  { key: 'price_per_participant', label: 'מחיר למשתתף', type: 'number' },
  { key: 'expected_participants', label: 'משתתפים צפויים', type: 'number' },
  { key: 'actual_participants', label: 'משתתפים בפועל', type: 'number' },
];
function emptyTierDraft() { return { age_group: '', price_per_participant: '', expected_participants: '', actual_participants: '' }; }

function PricingTiersSection({ mifalId }) {
  const { tiers, loading, createTier, updateTier, deleteTier } = usePricingTiers(mifalId);

  if (loading) return <Card title="הכנסה מהרשמה (רמות תמחור)"><p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p></Card>;

  return (
    <Card title="הכנסה מהרשמה (רמות תמחור)">
      <InlineGrid
        columns={TIER_COLUMNS}
        computedColumns={[
          { key: 'expected', label: 'הכנסה צפויה', compute: t => money((Number(t.expected_participants) || 0) * (Number(t.price_per_participant) || 0)) },
          { key: 'actual', label: 'הכנסה בפועל', compute: t => money((Number(t.actual_participants) || 0) * (Number(t.price_per_participant) || 0)) },
        ]}
        rows={tiers}
        makeEmptyDraft={emptyTierDraft}
        onCreate={createTier}
        onUpdate={updateTier}
        onDelete={deleteTier}
      />
    </Card>
  );
}

const INCOME_COLUMNS = [
  { key: 'source_name', label: 'מקור ההכנסה', type: 'text' },
  { key: 'amount', label: 'סכום', type: 'number' },
];
function emptyIncomeDraft() { return { source_name: '', amount: '' }; }

const EXPENSE_COLUMNS = [
  { key: 'expense_name', label: 'תיאור ההוצאה', type: 'text' },
  { key: 'supplier_name', label: 'ספק', type: 'creatable-select' },
  { key: 'expense_type', label: 'סוג הוצאה', type: 'ai-select', options: EXPENSE_TYPES, width: 140 },
  { key: 'quantity', label: 'כמות', type: 'number' },
  { key: 'unit_price', label: 'מחיר ליחידה', type: 'number' },
  { key: 'notes', label: 'הערות', type: 'text' },
];
function emptyExpenseDraft() { return { expense_name: '', supplier_name: '', expense_type: '', quantity: '', unit_price: '', notes: '' }; }

function BudgetTab({ mifalId }) {
  const { income, expenses, loading, addIncome, updateIncome, deleteIncome, addExpense, updateExpense, deleteExpense, budgetError, classifyingIds } = useBudget('mifal', mifalId);
  const { suppliers } = useSuppliers();
  const { tiers } = usePricingTiers(mifalId);
  const expenseColumns = EXPENSE_COLUMNS.map(c => (c.key === 'supplier_name' ? { ...c, options: suppliers } : c));
  const [expenseTypeFilter, setExpenseTypeFilter] = useState([]);
  function toggleExpenseType(key) { setExpenseTypeFilter(f => (f.includes(key) ? f.filter(k => k !== key) : [...f, key])); }
  function expenseTypeOf(e) { return e.expense_type && e.expense_type.trim() ? e.expense_type : 'לא מסווג'; }
  const expenseChartData = useMemo(() => {
    const totals = {};
    expenses.forEach(e => { const t = expenseTypeOf(e); totals[t] = (totals[t] || 0) + (Number(e.quantity) || 0) * (Number(e.unit_price) || 0); });
    return Object.entries(totals).filter(([, v]) => v > 0).map(([name, value]) => ({ key: name, name, value }));
  }, [expenses]);
  const filteredExpenses = expenseTypeFilter.length === 0 ? expenses : expenses.filter(e => expenseTypeFilter.includes(expenseTypeOf(e)));

  const tiersIncome = tiers.reduce((s, t) => s + (Number(t.actual_participants) || 0) * (Number(t.price_per_participant) || 0), 0);
  const totalIncome = income.reduce((s, r) => s + (Number(r.amount) || 0), 0) + tiersIncome;
  const totalExpenses = expenses.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unit_price) || 0), 0);
  const balance = totalIncome - totalExpenses;

  if (loading) return <p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p>;

  return (
    <div>
      {budgetError && (
        <div className="rounded-lg px-3 py-2 mb-3 text-xs" style={{ background: C.rustSoft, color: C.rust, border: `1px solid ${C.rust}` }}>
          {budgetError}
        </div>
      )}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 rounded-xl p-3.5 text-center" style={{ background: C.greenGoodSoft, border: `1px solid ${C.greenGood}40` }}>
          <div className="text-[10px] font-semibold" style={{ color: C.greenGood }}>סה"כ הכנסה (כולל הרשמה)</div>
          <div className="text-base font-bold" style={{ color: C.greenGood }}>{money(totalIncome)}</div>
        </div>
        <div className="flex-1 rounded-xl p-3.5 text-center" style={{ background: C.rustSoft, border: `1px solid ${C.rust}40` }}>
          <div className="text-[10px] font-semibold" style={{ color: C.rust }}>סה"כ הוצאה</div>
          <div className="text-base font-bold" style={{ color: C.rust }}>{money(totalExpenses)}</div>
        </div>
        <div className="flex-1 rounded-xl p-3.5 text-center" style={{ background: balance >= 0 ? C.greenGoodSoft : C.rustSoft, border: `1px solid ${(balance >= 0 ? C.greenGood : C.rust)}40` }}>
          <div className="text-[10px] font-semibold" style={{ color: balance >= 0 ? C.greenGood : C.rust }}>יתרה</div>
          <div className="text-base font-bold" style={{ color: balance >= 0 ? C.greenGood : C.rust }}>{money(balance)}</div>
        </div>
      </div>

      <PricingTiersSection mifalId={mifalId} />

      <Card title="הכנסות נוספות">
        <InlineGrid
          columns={INCOME_COLUMNS}
          computedColumns={[]}
          rows={income}
          makeEmptyDraft={emptyIncomeDraft}
          onCreate={addIncome}
          onUpdate={updateIncome}
          onDelete={deleteIncome}
        />
      </Card>

      {expenseChartData.length > 0 && (
        <div className="mb-4">
          <CrossFilterDonutChart title="הוצאות לפי סוג" unitLabel="סכום" data={expenseChartData} selected={expenseTypeFilter} onToggle={toggleExpenseType} valueFormatter={money} />
        </div>
      )}

      <Card title="הוצאות">
        <InlineGrid
          columns={expenseColumns}
          computedColumns={[{ key: 'total', label: 'סה"כ', compute: r => money((Number(r.quantity) || 0) * (Number(r.unit_price) || 0)) }]}
          rows={filteredExpenses}
          makeEmptyDraft={emptyExpenseDraft}
          onCreate={addExpense}
          onUpdate={updateExpense}
          onDelete={deleteExpense}
          getCellExtra={(row, col) => (col.key === 'expense_type' ? { isClassifying: classifyingIds.has(row.id) } : {})}
        />
      </Card>
    </div>
  );
}

function SummaryStat({ label, value, tone }) {
  const toneColor = tone === 'good' ? C.greenGood : tone === 'rust' ? C.rust : C.ink;
  return (
    <div className="rounded-xl p-3.5 flex-1 min-w-[130px]" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
      <div className="text-[11px] font-semibold mb-1" style={{ color: C.inkSoft }}>{label}</div>
      <div className="text-base font-bold" style={{ color: toneColor }}>{value}</div>
    </div>
  );
}

export default function MifalDetailView({ mifalId }) {
  const router = useRouter();
  const { mifal, loading, updateMifal, deleteMifal } = useMifal(mifalId);
  const { tiers } = usePricingTiers(mifalId);
  const { income, expenses } = useBudget('mifal', mifalId);
  const [tab, setTab] = useState('tasks');
  const [editOpen, setEditOpen] = useState(false);

  async function handleDelete() {
    if (!confirm(`האם אתה בטוח שאתה רוצה למחוק את מפעל "${mifal.name || 'ללא שם'}"?`)) return;
    const ok = await deleteMifal();
    if (ok) router.push('/');
  }

  if (loading) return <p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p>;
  if (!mifal) return <p className="text-sm" style={{ color: C.rust }}>המפעל לא נמצא.</p>;

  const def = ALL_TYPES[mifal.type] || {};
  const Icon = def.icon;
  const isPrep = mifal.type === 'preparation';
  const dateSingle = mifal.type === 'day_trip' || (isPrep && mifal.prep_date_mode === 'single');

  const expectedParticipants = tiers.reduce((s, t) => s + (Number(t.expected_participants) || 0), 0);
  const actualParticipants = tiers.reduce((s, t) => s + (Number(t.actual_participants) || 0), 0);
  const extIncome = income.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalExpenses = expenses.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unit_price) || 0), 0);
  const expectedIncome = tiers.reduce((s, t) => s + (Number(t.expected_participants) || 0) * (Number(t.price_per_participant) || 0), 0) + extIncome;
  const actualIncome = tiers.reduce((s, t) => s + (Number(t.actual_participants) || 0) * (Number(t.price_per_participant) || 0), 0) + extIncome;
  const expectedBalance = expectedIncome - totalExpenses;
  const actualBalance = actualIncome - totalExpenses;

  return (
    <div>
      <Link href="/" className="flex items-center gap-1.5 text-sm font-medium mb-4" style={{ color: C.inkSoft }}><ArrowRight size={15} /> חזרה</Link>

      <MifalModal open={editOpen} onClose={() => setEditOpen(false)} existing={mifal} onSave={updateMifal} />

      <div className="rounded-xl p-5 mb-5" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {Icon && <Icon size={15} style={{ color: C.forestLight }} />}
            <span className="text-xs font-semibold" style={{ color: C.inkSoft }}>{def.label}</span>
          </div>
          <div className="flex items-center gap-1">
            <IconButton icon={Pencil} title="עריכת מאפייני המפעל" onClick={() => setEditOpen(true)} />
            <IconButton icon={Trash2} tone="danger" title="מחיקת המפעל" onClick={handleDelete} />
          </div>
        </div>
        <h1 className="text-xl font-bold mb-4" style={{ fontFamily: 'Rubik, sans-serif', color: C.forestDark }}>{mifal.name || 'מפעל ללא שם'}</h1>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-3">
          <InfoField label="בעל תפקיד אחראי" value={mifal.lead_role} />
          <InfoField label="רשויות" value={(mifal.target_municipalities || []).join(', ')} />
          {!isPrep && <InfoField label="קהל יעד" value={(mifal.target_audience || []).join(', ')} />}
          <InfoField label="מועד תחילת עבודה" value={formatDate(mifal.work_start_date)} />
          <InfoField label="מועד פעיל" value={mifal.date_mode === 'backup' ? 'חלופי' : 'מקורי'} />
          <InfoField label="סטטוס" value={<MifalStatusControl mifal={mifal} onUpdateStatus={s => updateMifal({ status: s })} />} />
          {mifal.type === 'day_trip' ? (
            <>
              <InfoField label="סוג טיול" value={mifal.trip_type} />
              <InfoField label="תאריך המפעל" value={formatDate(mifal.event_date)} />
            </>
          ) : dateSingle ? (
            <InfoField label="תאריך ההכנה" value={formatDate(mifal.event_date)} />
          ) : (
            <>
              <InfoField label={mifal.type === 'multi_day' ? 'סוג מחנה' : mifal.type === 'seminar' ? 'סוג סמינר' : 'הכנת מדריכים'} value={mifal.type === 'multi_day' ? mifal.camp_type : mifal.type === 'seminar' ? mifal.seminar_type : 'הכנה'} />
              <InfoField label="תאריך המפעל - התחלה" value={formatDate(mifal.start_date)} />
            </>
          )}
          {!dateSingle && <InfoField label="תאריך המפעל - סיום" value={formatDate(mifal.end_date)} />}
          {dateSingle ? <InfoField label="תאריך גיבוי" value={formatDate(mifal.backup_date)} /> : <InfoField label="תאריך תחילת גיבוי" value={formatDate(mifal.backup_start_date)} />}
          {!dateSingle && <InfoField label="תאריך סיום גיבוי" value={formatDate(mifal.backup_end_date)} />}
          <InfoField label="מיקום" value={mifal.accommodation} />
          <InfoField label="מסלולים" value={mifal.routes} />
          <InfoField label="הערות" value={mifal.comments} />
        </div>

        {!isPrep && (
          <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t" style={{ borderColor: C.line }}>
            <div className="flex-1 min-w-[280px]">
              <div className="text-xs font-bold mb-2 text-center py-1 rounded-md" style={{ color: C.forestDark, background: C.ochreSoft }}>תכנון (צפוי)</div>
              <div className="flex gap-2">
                <SummaryStat label='סה"כ צפי חניכים' value={expectedParticipants} />
                <SummaryStat label="יתרה צפויה" value={money(expectedBalance)} tone={expectedBalance >= 0 ? 'good' : 'rust'} />
              </div>
            </div>
            <div className="flex-1 min-w-[280px]">
              <div className="text-xs font-bold mb-2 text-center py-1 rounded-md" style={{ color: C.forestDark, background: C.greenGoodSoft }}>בפועל</div>
              <div className="flex gap-2">
                <SummaryStat label='סה"כ חניכים בפועל' value={actualParticipants} />
                <SummaryStat label="יתרה עדכנית" value={money(actualBalance)} tone={actualBalance >= 0 ? 'good' : 'rust'} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-1 mb-5 border-b" style={{ borderColor: C.line }}>
        <button onClick={() => setTab('tasks')} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold -mb-px" style={tab === 'tasks' ? { color: C.forestDark, borderBottom: `2px solid ${C.ochre}` } : { color: C.inkSoft, borderBottom: '2px solid transparent' }}>
          <ListChecks size={14} /> משימות
        </button>
        <button onClick={() => setTab('budget')} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold -mb-px" style={tab === 'budget' ? { color: C.forestDark, borderBottom: `2px solid ${C.ochre}` } : { color: C.inkSoft, borderBottom: '2px solid transparent' }}>
          <Wallet size={14} /> תקציב
        </button>
        {!isPrep && (
          <button onClick={() => setTab('occurrences')} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold -mb-px" style={tab === 'occurrences' ? { color: C.forestDark, borderBottom: `2px solid ${C.ochre}` } : { color: C.inkSoft, borderBottom: '2px solid transparent' }}>
            <CalendarDays size={14} /> מופעים
          </button>
        )}
        <button onClick={() => setTab('buses')} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold -mb-px" style={tab === 'buses' ? { color: C.forestDark, borderBottom: `2px solid ${C.ochre}` } : { color: C.inkSoft, borderBottom: '2px solid transparent' }}>
          <Bus size={14} /> סידור אוטובוסים
        </button>
        <button onClick={() => setTab('files')} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold -mb-px" style={tab === 'files' ? { color: C.forestDark, borderBottom: `2px solid ${C.ochre}` } : { color: C.inkSoft, borderBottom: '2px solid transparent' }}>
          <Upload size={14} /> קבצים
        </button>
      </div>

      {tab === 'tasks' && <TasksTab mifalId={mifal.id} />}
      {tab === 'budget' && <BudgetTab mifalId={mifal.id} />}
      {tab === 'occurrences' && !isPrep && <OccurrencesTab mifal={mifal} />}
      {tab === 'buses' && <BusLogisticsTab mifalId={mifal.id} />}
      {tab === 'files' && <FilesTab mifalId={mifal.id} />}
    </div>
  );
}
