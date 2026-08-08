'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Plus, Trash2, Pencil, Tent, ArrowUpDown } from 'lucide-react';
import { useMifalim } from '../lib/useMifalim';
import { useFiles } from '../lib/useFiles';
import { C, ALL_TYPES, STATUS_OPTIONS, ACTIVE_STATUSES, LEAD_ROLES, AUDIENCE_ROWS, TRIP_TYPES, CAMP_TYPES, SEMINAR_TYPES, REQUIRED_FILE_CATEGORIES } from '../lib/designSystem';
import { Field, TextInput, TextArea, Select, Badge, StatusBadge, IconButton, Card, Modal, ActiveScheduleToggle, AudienceBubbleSelect, MunicipalitySelect, ToggleSwitch, HeaderFilterPopover, ExportButton } from './ui';
import CrossFilterDonutChart from './CrossFilterDonutChart';

function money(n) { return (Number(n) || 0).toLocaleString('he-IL', { maximumFractionDigits: 0 }) + ' ₪'; }
function isSingleDateType(m) { return m.type === 'day_trip' || (m.type === 'preparation' && m.prep_date_mode === 'single'); }
function startDateOf(m) {
  return m.date_mode === 'backup' ? (isSingleDateType(m) ? m.backup_date : m.backup_start_date) : (isSingleDateType(m) ? m.event_date : m.start_date);
}
function dateRangeLabel(m) {
  const start = startDateOf(m);
  const end = isSingleDateType(m) ? start : (m.date_mode === 'backup' ? m.backup_end_date : m.end_date);
  if (!start) return '—';
  const fmt = d => { if (!d) return '?'; const [y, mo, da] = d.split('-'); return `${da}/${mo}/${y}`; };
  return isSingleDateType(m) ? fmt(start) : `${fmt(start)}-${fmt(end)}`;
}

export function createEmptyDraft(type) {
  const base = {
    type, name: '', lead_role: '', target_audience: [], target_municipalities: [],
    comments: '', work_start_date: '', date_mode: 'original', status: 'מתוכנן',
    routes: '', accommodation: '',
  };
  if (type === 'day_trip') return { ...base, trip_type: TRIP_TYPES[0], event_date: '', backup_date: '' };
  if (type === 'multi_day') return { ...base, camp_type: CAMP_TYPES[0], start_date: '', end_date: '', backup_start_date: '', backup_end_date: '' };
  if (type === 'preparation') return { ...base, prep_date_mode: 'single', event_date: '', backup_date: '' };
  return { ...base, seminar_type: SEMINAR_TYPES[0], start_date: '', end_date: '', backup_start_date: '', backup_end_date: '' };
}

export function MifalForm({ draft, setDraft }) {
  function set(patch) { setDraft(d => ({ ...d, ...patch })); }
  const isPrep = draft.type === 'preparation';
  const dateSingle = draft.type === 'day_trip' || (isPrep && draft.prep_date_mode === 'single');
  const typeOptions = draft.type === 'day_trip' ? TRIP_TYPES : draft.type === 'multi_day' ? CAMP_TYPES : draft.type === 'seminar' ? SEMINAR_TYPES : [];
  const typeValue = draft.type === 'day_trip' ? draft.trip_type : draft.type === 'multi_day' ? draft.camp_type : draft.seminar_type;
  const typeLabel = draft.type === 'day_trip' ? 'סוג טיול' : draft.type === 'multi_day' ? 'סוג מחנה' : 'סוג סמינר';
  function setTypeValue(v) { set(draft.type === 'day_trip' ? { trip_type: v } : draft.type === 'multi_day' ? { camp_type: v } : { seminar_type: v }); }

  return (
    <div className="flex flex-col gap-4">
      <Field label="שם המפעל"><TextInput value={draft.name} onChange={e => set({ name: e.target.value })} placeholder="לדוגמה: מחנה קיץ שכבת ז'" /></Field>
      <Field label="בעל תפקיד אחראי">
        <Select value={draft.lead_role} onChange={e => set({ lead_role: e.target.value })}>
          <option value="">בחר בעל תפקיד</option>
          {LEAD_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </Select>
      </Field>
      <Field label="רשויות"><MunicipalitySelect value={draft.target_municipalities} onChange={v => set({ target_municipalities: v })} /></Field>
      {!isPrep && <Field label="קהל יעד (שכבות גיל)"><AudienceBubbleSelect rows={AUDIENCE_ROWS} value={draft.target_audience} onChange={v => set({ target_audience: v })} /></Field>}

      <div className="pt-2 border-t flex flex-col gap-4" style={{ borderColor: C.line }}>
        {!isPrep && <Field label={typeLabel}><Select value={typeValue} onChange={e => setTypeValue(e.target.value)}>{typeOptions.map(t => <option key={t} value={t}>{t}</option>)}</Select></Field>}
        {dateSingle ? (
          <Field label="תאריך המפעל"><TextInput type="date" value={draft.event_date} onChange={e => set({ event_date: e.target.value })} /></Field>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="תאריך התחלה"><TextInput type="date" value={draft.start_date} onChange={e => set({ start_date: e.target.value })} /></Field>
            <Field label="תאריך סיום"><TextInput type="date" value={draft.end_date} onChange={e => set({ end_date: e.target.value })} /></Field>
          </div>
        )}
        {dateSingle ? (
          <Field label="תאריך גיבוי"><TextInput type="date" value={draft.backup_date} onChange={e => set({ backup_date: e.target.value })} /></Field>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="תאריך תחילת גיבוי"><TextInput type="date" value={draft.backup_start_date} onChange={e => set({ backup_start_date: e.target.value })} /></Field>
            <Field label="תאריך סיום גיבוי"><TextInput type="date" value={draft.backup_end_date} onChange={e => set({ backup_end_date: e.target.value })} /></Field>
          </div>
        )}
        <Field label="מיקום"><TextInput value={draft.accommodation} onChange={e => set({ accommodation: e.target.value })} placeholder="לדוגמה: כפר נופש הדסים" /></Field>
        <Field label="מסלולים"><TextArea value={draft.routes} onChange={e => set({ routes: e.target.value })} /></Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t" style={{ borderColor: C.line }}>
        <Field label="מועד תחילת עבודה"><TextInput type="date" value={draft.work_start_date} onChange={e => set({ work_start_date: e.target.value })} /></Field>
        <Field label="מועד פעיל"><ActiveScheduleToggle value={draft.date_mode} onChange={v => set({ date_mode: v })} /></Field>
      </div>
      <Field label="הערות"><TextArea value={draft.comments} onChange={e => set({ comments: e.target.value })} /></Field>
    </div>
  );
}

export function MifalModal({ open, onClose, existing, onSave }) {
  const [step, setStep] = useState(existing ? 'form' : 'type');
  const [draft, setDraft] = useState(existing || null);
  const [saving, setSaving] = useState(false);

  // `existing` only reflects the row the user clicked "edit" on for as long as this component
  // instance stays mounted with the same open/existing props — since useState's initializer only
  // runs once (on first mount), it can capture 'type'/null from before any row was picked. Without
  // resyncing on every open, the very first edit shows the "create" type-picker (whose type buttons
  // reset `draft` to a blank new-mifal shape) instead of the real edit form, and saving that blank
  // draft silently overwrites the mifal's actual data.
  useEffect(() => {
    if (open) {
      setStep(existing ? 'form' : 'type');
      setDraft(existing || null);
    }
  }, [open, existing]);

  function openWithType(type) { setDraft(createEmptyDraft(type)); setStep('form'); }

  async function handleSave() {
    if (!draft.name.trim()) return;
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    onClose();
  }

  function handleClose() {
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={existing ? 'עריכת מפעל' : step === 'type' ? 'יצירת מפעל חדש' : 'יצירת מפעל חדש'}
      width={step === 'type' ? 'max-w-sm' : 'max-w-2xl'}
      footer={step === 'form' ? (
        <>
          <button onClick={handleClose} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ color: C.inkSoft }}>ביטול</button>
          <button disabled={saving || !draft?.name?.trim()} onClick={handleSave} className="px-5 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: C.forest, opacity: saving || !draft?.name?.trim() ? 0.6 : 1 }}>
            {saving ? 'שומר...' : existing ? 'שמירה' : 'יצירה'}
          </button>
        </>
      ) : null}
    >
      {step === 'type' && (
        <div className="flex flex-col gap-2">
          <p className="text-sm mb-1" style={{ color: C.inkSoft }}>בחרו סוג מפעל:</p>
          {Object.entries(ALL_TYPES).map(([key, def]) => {
            const Icon = def.icon;
            return (
              <button key={key} onClick={() => openWithType(key)} className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors" style={{ color: C.forestDark, border: `1px solid ${C.line}`, background: C.paper }}>
                <Icon size={16} /> {def.label}
              </button>
            );
          })}
        </div>
      )}
      {step === 'form' && draft && <MifalForm draft={draft} setDraft={setDraft} />}
    </Modal>
  );
}

// Standalone status control (a clickable StatusBadge that opens a dropdown) — pulled out of the
// edit form since status changes far more often than the rest of a mifal's details, and now
// carries real business logic (blocking "הסתיים" without the 4 required document types). Used
// both from the list row and the mifal detail header. Only fetches the mifal's files once the
// dropdown is actually opened (not on mount) — with a list of many rows, eagerly fetching files
// for every single one just to render a badge would be a lot of wasted queries.
export function MifalStatusControl({ mifal, onUpdateStatus }) {
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [pos, setPos] = useState(null);
  const [error, setError] = useState('');
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const { files } = useFiles('mifal', everOpened ? mifal.id : null);

  useEffect(() => {
    function h(e) {
      if (btnRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function openMenu() {
    setEverOpened(true);
    setError('');
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setOpen(true);
  }

  function select(newStatus) {
    if (newStatus === mifal.status) { setOpen(false); return; }
    if (newStatus === 'הסתיים') {
      const present = new Set(files.map(f => f.category));
      const missing = REQUIRED_FILE_CATEGORIES.filter(c => !present.has(c));
      if (missing.length > 0) { setError(`לא ניתן לסגור — חסרים המסמכים: ${missing.join(', ')}.`); return; }
    }
    onUpdateStatus(newStatus);
    setOpen(false);
  }

  return (
    <div className="inline-block">
      <button ref={btnRef} type="button" onClick={() => (open ? setOpen(false) : openMenu())}>
        <StatusBadge status={mifal.status} />
      </button>
      {open && pos && createPortal(
        <div ref={menuRef} onClick={e => e.stopPropagation()} className="rounded-lg shadow-lg p-1.5" style={{ position: 'fixed', top: pos.top, right: pos.right, minWidth: 180, zIndex: 9999, background: C.surface, border: `1px solid ${C.line}` }}>
          {error && <p className="text-[10px] px-2 py-1.5 mb-1 rounded" style={{ background: C.rustSoft, color: C.rust }}>{error}</p>}
          {STATUS_OPTIONS.map(s => (
            <button key={s} type="button" onClick={() => select(s)} className="w-full text-right px-2 py-1.5 rounded hover:bg-black/5 flex items-center">
              <StatusBadge status={s} />
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

export default function MifalimList() {
  const { mifalim, loading, createMifal, updateMifal, deleteMifal } = useMifalim();
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [activeOnly, setActiveOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState(null);
  const [roleFilter, setRoleFilter] = useState(null);
  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pRange, setPRange] = useState(['', '']);
  const [bRange, setBRange] = useState(['', '']);
  const [dateFilter, setDateFilter] = useState(['', '']);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const editingMifal = mifalim.find(m => m.id === editId);

  function passBaseFilters(m) {
    if (activeOnly && !ACTIVE_STATUSES.includes(m.status)) return false;
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (nameFilter && !(m.name || '').toLowerCase().includes(nameFilter.toLowerCase())) return false;
    const p = Number(m.participants) || 0;
    if (pRange[0] !== '' && p < Number(pRange[0])) return false;
    if (pRange[1] !== '' && p > Number(pRange[1])) return false;
    const bal = Number(m.balance) || 0;
    if (bRange[0] !== '' && bal < Number(bRange[0])) return false;
    if (bRange[1] !== '' && bal > Number(bRange[1])) return false;
    const start = startDateOf(m);
    if (dateFilter[0] !== '' && (!start || start < dateFilter[0])) return false;
    if (dateFilter[1] !== '' && (!start || start > dateFilter[1])) return false;
    return true;
  }

  const typeChartData = useMemo(() => {
    const src = mifalim.filter(m => passBaseFilters(m) && (!roleFilter || m.lead_role === roleFilter));
    return Object.entries(ALL_TYPES).map(([key, def]) => ({ key, name: def.label, value: src.filter(m => m.type === key).length })).filter(t => t.value > 0);
  }, [mifalim, roleFilter, activeOnly, statusFilter, nameFilter, pRange, bRange, dateFilter]);

  const roleChartData = useMemo(() => {
    const src = mifalim.filter(m => passBaseFilters(m) && (!typeFilter || m.type === typeFilter));
    const counts = {};
    src.forEach(m => { const key = m.lead_role || 'לא הוגדר'; counts[key] = (counts[key] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ key: name, name, value }));
  }, [mifalim, typeFilter, activeOnly, statusFilter, nameFilter, pRange, bRange, dateFilter]);

  const filtered = mifalim.filter(m => passBaseFilters(m) && (!typeFilter || m.type === typeFilter) && (!roleFilter || m.lead_role === roleFilter));
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const getVal = m => sortKey === 'type' ? (ALL_TYPES[m.type]?.label || '') : sortKey === 'date' ? dateRangeLabel(m) : (sortKey === 'participants' || sortKey === 'balance') ? (Number(m[sortKey]) || 0) : m[sortKey] || '';
    return [...filtered].sort((a, b) => {
      const av = getVal(a), bv = getVal(b);
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv), 'he');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);
  function toggleSort(key) { setSortKey(k => { if (k !== key) { setSortDir('asc'); return key; } setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return key; }); }

  const anyFilter = typeFilter || roleFilter || statusFilter !== 'all' || nameFilter || pRange[0] !== '' || pRange[1] !== '' || bRange[0] !== '' || bRange[1] !== '' || dateFilter[0] !== '' || dateFilter[1] !== '';

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Rubik, sans-serif', color: C.forestDark }}>כל המפעלים</h1>

      <MifalModal open={createOpen} onClose={() => setCreateOpen(false)} existing={null} onSave={createMifal} />
      <MifalModal open={!!editId} onClose={() => setEditId(null)} existing={editingMifal} onSave={draft => updateMifal(editId, draft)} />

      <div className="mb-4 flex items-center gap-3">
        <ToggleSwitch value={activeOnly ? 'active' : 'all'} onChange={v => setActiveOnly(v === 'active')} leftLabel="כל המפעלים" rightLabel="מפעלים פעילים" leftValue="all" rightValue="active" />
        {anyFilter && (
          <button onClick={() => { setTypeFilter(null); setRoleFilter(null); setStatusFilter('all'); setNameFilter(''); setPRange(['', '']); setBRange(['', '']); setDateFilter(['', '']); }} className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: C.rustSoft, color: C.rust }}>נקה סינון ✕</button>
        )}
      </div>

      {!loading && mifalim.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <CrossFilterDonutChart title="התפלגות מפעלים לפי סוג מפעל" unitLabel="כמות מפעלים" data={typeChartData} selected={typeFilter ? [typeFilter] : []} onToggle={key => setTypeFilter(f => f === key ? null : key)} />
          <CrossFilterDonutChart title="התפלגות מפעלים לפי אחראי" unitLabel="כמות מפעלים" data={roleChartData} selected={roleFilter ? [roleFilter] : []} onToggle={key => setRoleFilter(f => f === key ? null : key)} />
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: C.forest }}>
          <Plus size={16} /> יצירת מפעל חדש
        </button>
        {sorted.length > 0 && (
          <ExportButton
            rows={sorted}
            filename="מפעלים.xlsx"
            columns={[
              { key: 'name', label: 'שם' },
              { key: 'type', label: 'סוג', value: m => ALL_TYPES[m.type]?.label || m.type },
              { key: 'lead_role', label: 'אחראי' },
              { key: 'date', label: 'תאריכים', value: dateRangeLabel },
              { key: 'participants', label: 'משתתפים' },
              { key: 'status', label: 'סטטוס' },
              { key: 'balance', label: 'יתרה', value: m => money(m.balance) },
            ]}
          />
        )}
      </div>

      <Card>
        {loading ? (
          <p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={{ background: C.paper, border: `1px dashed ${C.line}`, color: C.inkSoft }}>
            <Tent size={28} className="mx-auto mb-3" style={{ color: C.sage }} />
            {mifalim.length === 0 ? 'אין עדיין מפעלים — תלחצו על "יצירת מפעל חדש" למעלה' : 'לא נמצאו מפעלים התואמים לסינון'}
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: C.forest }}>
                  <th className="w-10"></th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-white">
                    <HeaderFilterPopover label="שם המפעל" type="text" value={nameFilter} onChange={setNameFilter} sortKey="name" activeSortKey={sortKey} onSort={toggleSort} />
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-white">
                    <HeaderFilterPopover label="סוג" type="select" value={typeFilter || 'all'} onChange={v => setTypeFilter(v === 'all' ? null : v)} options={Object.entries(ALL_TYPES).map(([key, def]) => ({ value: key, label: def.label }))} sortKey="type" activeSortKey={sortKey} onSort={toggleSort} />
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-white">
                    <HeaderFilterPopover label="אחראי" type="select" value={roleFilter || 'all'} onChange={v => setRoleFilter(v === 'all' ? null : v)} options={LEAD_ROLES.map(r => ({ value: r, label: r }))} sortKey="lead_role" activeSortKey={sortKey} onSort={toggleSort} />
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-white">
                    <HeaderFilterPopover label="תאריכים" type="date-range" value={dateFilter} onChange={setDateFilter} sortKey="date" activeSortKey={sortKey} onSort={toggleSort} />
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-white">
                    <HeaderFilterPopover label="משתתפים" type="range" value={pRange} onChange={setPRange} sortKey="participants" activeSortKey={sortKey} onSort={toggleSort} />
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-white">
                    <HeaderFilterPopover label="סטטוס" type="select" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS.map(s => ({ value: s, label: s }))} sortKey="status" activeSortKey={sortKey} onSort={toggleSort} />
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-white">
                    <HeaderFilterPopover label="יתרה" type="range" value={bRange} onChange={setBRange} sortKey="balance" activeSortKey={sortKey} onSort={toggleSort} />
                  </th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((m, i) => {
                  const def = ALL_TYPES[m.type] || {};
                  const Icon = def.icon || Tent;
                  const balance = Number(m.balance) || 0;
                  return (
                    <tr key={m.id} style={{ background: i % 2 ? '#FAFAF3' : C.surface, borderTop: `1px solid ${C.line}` }}>
                      <td className="px-2 py-3 text-center"><IconButton icon={Pencil} title="עריכה" onClick={() => setEditId(m.id)} /></td>
                      <td className="px-4 py-3 font-semibold">
                        <Link href={`/mifal/${m.id}`} className="hover:underline" style={{ color: C.forestDark }}>{m.name || 'מפעל ללא שם'}</Link>
                      </td>
                      <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-xs" style={{ color: C.inkSoft }}><Icon size={13} />{def.label || m.type}</span></td>
                      <td className="px-4 py-3 text-xs" style={{ color: C.inkSoft }}>{m.lead_role || '—'}</td>
                      <td className="px-4 py-3 text-xs">{dateRangeLabel(m)}</td>
                      <td className="px-4 py-3 text-xs">{m.participants || 0}</td>
                      <td className="px-4 py-3"><MifalStatusControl mifal={m} onUpdateStatus={s => updateMifal(m.id, { status: s })} /></td>
                      <td className="px-4 py-3"><Badge tone={balance >= 0 ? 'good' : 'rust'}>{money(balance)}</Badge></td>
                      <td className="px-2 py-3 text-center">
                        <IconButton icon={Trash2} tone="danger" title="מחיקת מפעל" onClick={() => { if (confirm(`האם אתה בטוח שאתה רוצה למחוק את מפעל "${m.name || 'ללא שם'}"?`)) deleteMifal(m.id); }} />
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
