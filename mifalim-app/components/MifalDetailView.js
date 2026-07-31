'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Plus, Trash2, Pencil, ListChecks, Wallet, UserPlus, LayoutGrid, TableIcon, CalendarDays, Upload, Wrench, Download, Bus } from 'lucide-react';
import { MifalModal, MifalForm, createEmptyDraft } from './MifalimList';
import BusLogisticsTab from './BusLogisticsTab';
import { useMifal } from '../lib/useMifal';
import { useMifalTasks } from '../lib/useMifalTasks';
import { useBudget } from '../lib/useBudget';
import { useStakeholders } from '../lib/useStakeholders';
import { usePricingTiers } from '../lib/usePricingTiers';
import { useOccurrences } from '../lib/useOccurrences';
import { useFiles } from '../lib/useFiles';
import { usePreparations } from '../lib/usePreparations';
import { C, ALL_TYPES, FILE_CATEGORIES, EXPENSE_TYPES } from '../lib/designSystem';
import { InfoField, StatusBadge, TextInput, IconButton, Card, Modal, InlineGrid, ExportButton } from './ui';

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
const FILES_PAGE_SIZE = 5;

function FilesSection({ title, rows, onRemove, onRecategorize, onDownload, categories, dragActive, onDragOver, onDragLeave, onDrop, page, setPage }) {
  const pageRows = rows.slice(page * FILES_PAGE_SIZE, page * FILES_PAGE_SIZE + FILES_PAGE_SIZE);
  return (
    // The drag handlers + highlight live on this OUTER wrapper (the full card), not some inner
    // element sized to its content — otherwise the highlighted "drop here" area shrinks down to
    // whatever's inside (e.g. just the empty-state sentence) while the real, whole-card drop
    // target underneath looks unmarked. dragleave also has to check relatedTarget: without that,
    // it fires (and clears the highlight) every time the pointer crosses onto a child element
    // inside the card, not just when it actually leaves the card — making the zone flicker/feel
    // broken while dragging over it.
    <div
      onDragOver={onDragOver}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) onDragLeave(); }}
      onDrop={onDrop}
      className="rounded-xl transition-colors"
      style={{ outline: dragActive ? `2px dashed ${C.ochre}` : 'none', outlineOffset: 2, background: dragActive ? C.ochreSoft : 'transparent' }}
    >
      <Card title={`${title} (${rows.length})`}>
        {rows.length === 0 ? (
          <p className="text-xs" style={{ color: C.inkSoft }}>אין קבצים בקטגוריה זו — גררו קובץ לכאן.</p>
        ) : (
          <>
            <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ background: '#E3E4D6' }}>
                    {['שם הקובץ', 'גודל', 'עודכן', 'עודכן ע"י', ...(categories.length > 1 ? ['קטגוריה'] : []), 'הורדה', ''].map(h => (
                      <th key={h} className="text-right px-3 py-2 text-xs font-semibold" style={{ color: C.forestDark }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((f, i) => (
                    <tr key={f.id} style={{ background: i % 2 ? '#FAFAF3' : C.surface, borderTop: `1px solid ${C.line}` }}>
                      <td className="px-3 py-2"><button onClick={() => onDownload(f)} className="font-medium hover:underline" style={{ color: C.forestDark }}>{f.name}</button></td>
                      <td className="px-3 py-2 text-xs" style={{ color: C.inkSoft }}>{((f.size || 0) / 1024).toFixed(0)} KB</td>
                      <td className="px-3 py-2 text-xs" style={{ color: C.inkSoft }}>{f.modified_at ? new Date(f.modified_at).toLocaleDateString('he-IL') : ''}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: C.inkSoft }}>{f.profiles?.full_name || '—'}</td>
                      {categories.length > 1 && (
                        <td className="px-3 py-2">
                          <select value={f.category || categories[0]} onChange={e => onRecategorize(f.id, e.target.value)} className="text-xs rounded-md px-2 py-1" style={{ border: `1px solid ${C.line}` }}>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                      )}
                      <td className="px-3 py-2"><button onClick={() => onDownload(f)}><Download size={14} style={{ color: C.forestLight }} /></button></td>
                      <td className="px-2 py-2 text-center"><IconButton icon={Trash2} tone="danger" onClick={() => onRemove(f)} title="מחיקה" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > FILES_PAGE_SIZE && (
              <div className="flex items-center justify-center gap-3 mt-2 text-xs">
                <button disabled={page === 0} onClick={() => setPage(page - 1)} style={{ opacity: page === 0 ? 0.4 : 1 }}>הקודם</button>
                <span style={{ color: C.inkSoft }}>עמוד {page + 1} מתוך {Math.ceil(rows.length / FILES_PAGE_SIZE)}</span>
                <button disabled={(page + 1) * FILES_PAGE_SIZE >= rows.length} onClick={() => setPage(page + 1)} style={{ opacity: (page + 1) * FILES_PAGE_SIZE >= rows.length ? 0.4 : 1 }}>הבא</button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

function FilesTab({ mifalId, categories = FILE_CATEGORIES }) {
  const { files, loading, uploadFiles, recategorizeFile, deleteFile, getDownloadUrl } = useFiles('mifal', mifalId);
  const [pages, setPages] = useState({});
  const [dragCat, setDragCat] = useState(null);
  const isFlat = categories.length === 1;

  async function handleDownload(f) {
    const url = await getDownloadUrl(f);
    if (url) window.open(url, '_blank');
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold" style={{ color: C.forestDark }}>קבצי {isFlat ? 'הפרויקט' : 'המפעל'}</h3>
        <div className="flex items-center gap-2">
          {files.length > 0 && (
            <ExportButton
              rows={files.map(f => ({ ...f, modified_by: f.profiles?.full_name || '—' }))}
              filename="קבצים.xlsx"
              columns={[{ key: 'name', label: 'שם' }, { key: 'category', label: 'קטגוריה' }, { key: 'modified_at', label: 'עודכן' }, { key: 'modified_by', label: 'עודכן ע"י' }]}
            />
          )}
          <label className="text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer text-white" style={{ background: C.forest }}>
            העלאת קובץ
            <input type="file" multiple className="hidden" onChange={e => { uploadFiles(e.target.files, categories[0]); e.target.value = ''; }} />
          </label>
        </div>
      </div>
      {!isFlat && <p className="text-[11px] mb-4" style={{ color: C.inkSoft }}>גררו קובץ ישירות לתוך אחת הקטגוריות למטה כדי לתייג אותו אוטומטית.</p>}
      {loading ? (
        <p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p>
      ) : isFlat ? (
        <FilesSection
          title={categories[0]}
          rows={files}
          onRemove={deleteFile}
          onRecategorize={recategorizeFile}
          onDownload={handleDownload}
          categories={categories}
          dragActive={dragCat === categories[0]}
          onDragOver={e => { e.preventDefault(); setDragCat(categories[0]); }}
          onDragLeave={() => setDragCat(null)}
          onDrop={e => { e.preventDefault(); uploadFiles(e.dataTransfer.files, categories[0]); setDragCat(null); }}
          page={pages[categories[0]] || 0}
          setPage={p => setPages(x => ({ ...x, [categories[0]]: p }))}
        />
      ) : categories.map(cat => (
        <FilesSection
          key={cat}
          title={cat}
          rows={files.filter(f => f.category === cat)}
          onRemove={deleteFile}
          onRecategorize={recategorizeFile}
          onDownload={handleDownload}
          categories={categories}
          dragActive={dragCat === cat}
          onDragOver={e => { e.preventDefault(); setDragCat(cat); }}
          onDragLeave={() => setDragCat(null)}
          onDrop={e => { e.preventDefault(); uploadFiles(e.dataTransfer.files, cat); setDragCat(null); }}
          page={pages[cat] || 0}
          setPage={p => setPages(x => ({ ...x, [cat]: p }))}
        />
      ))}
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
  { key: 'expense_type', label: 'סוג הוצאה', type: 'select', options: EXPENSE_TYPES },
  { key: 'supplier_name', label: 'ספק', type: 'text' },
  { key: 'quantity', label: 'כמות', type: 'number' },
  { key: 'unit_price', label: 'מחיר ליחידה', type: 'number' },
];
function emptyExpenseDraft() { return { expense_name: '', expense_type: '', supplier_name: '', quantity: '', unit_price: '' }; }

function BudgetTab({ mifalId }) {
  const { income, expenses, loading, addIncome, updateIncome, deleteIncome, addExpense, updateExpense, deleteExpense } = useBudget('mifal', mifalId);
  const { tiers } = usePricingTiers(mifalId);

  const tiersIncome = tiers.reduce((s, t) => s + (Number(t.actual_participants) || 0) * (Number(t.price_per_participant) || 0), 0);
  const totalIncome = income.reduce((s, r) => s + (Number(r.amount) || 0), 0) + tiersIncome;
  const totalExpenses = expenses.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unit_price) || 0), 0);
  const balance = totalIncome - totalExpenses;

  if (loading) return <p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p>;

  return (
    <div>
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

      <Card title="הוצאות">
        <InlineGrid
          columns={EXPENSE_COLUMNS}
          computedColumns={[{ key: 'total', label: 'סה"כ', compute: r => money((Number(r.quantity) || 0) * (Number(r.unit_price) || 0)) }]}
          rows={expenses}
          makeEmptyDraft={emptyExpenseDraft}
          onCreate={addExpense}
          onUpdate={updateExpense}
          onDelete={deleteExpense}
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
  const { mifal, loading, updateMifal } = useMifal(mifalId);
  const { tiers } = usePricingTiers(mifalId);
  const { income, expenses } = useBudget('mifal', mifalId);
  const [tab, setTab] = useState('tasks');
  const [editOpen, setEditOpen] = useState(false);

  if (loading) return <p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p>;
  if (!mifal) return <p className="text-sm" style={{ color: C.rust }}>המפעל לא נמצא.</p>;

  const def = ALL_TYPES[mifal.type] || {};
  const Icon = def.icon;
  const isPrep = mifal.type === 'preparation';

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
          <IconButton icon={Pencil} title="עריכת מאפייני המפעל" onClick={() => setEditOpen(true)} />
        </div>
        <h1 className="text-xl font-bold mb-4" style={{ fontFamily: 'Rubik, sans-serif', color: C.forestDark }}>{mifal.name || 'מפעל ללא שם'}</h1>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-3">
          <InfoField label="בעל תפקיד אחראי" value={mifal.lead_role} />
          <InfoField label="רשויות" value={(mifal.target_municipalities || []).join(', ')} />
          {!isPrep && <InfoField label="קהל יעד" value={(mifal.target_audience || []).join(', ')} />}
          <InfoField label="מועד תחילת עבודה" value={formatDate(mifal.work_start_date)} />
          <InfoField label="מועד פעיל" value={mifal.date_mode === 'backup' ? 'חלופי' : 'מקורי'} />
          <InfoField label="סטטוס" value={<StatusBadge status={mifal.status} />} />
          <InfoField label="תאריכים" value={dateRangeLabel(mifal)} />
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
