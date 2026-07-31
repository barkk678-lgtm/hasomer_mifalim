'use client';
import { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, MapPin, Filter, FileSpreadsheet, ArrowUpDown, Trash2 } from 'lucide-react';
import { C, STATUS_TONE, DISTRICTS, ALL_MUNICIPALITIES } from '../lib/designSystem';
import { exportToExcel } from '../lib/exportExcel';

export function Field({ label, children, hint }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold tracking-wide" style={{ color: C.inkSoft }}>{label}</span>
      {children}
      {hint && <span className="text-[11px]" style={{ color: C.inkSoft }}>{hint}</span>}
    </label>
  );
}

export function InfoField({ label, value }) {
  return (
    <div>
      <div className="text-[11px] font-semibold tracking-wide" style={{ color: C.inkSoft }}>{label}</div>
      <div className="text-sm font-medium mt-0.5 truncate" style={{ color: C.ink }}>{value || '—'}</div>
    </div>
  );
}

const inputBase = 'w-full rounded-md px-3 py-2 text-sm outline-none transition-colors';
const inputStyle = { background: C.surface, border: `1px solid ${C.line}`, color: C.ink };

export function TextInput(props) {
  return <input {...props} className={`${inputBase} ${props.className || ''}`} style={inputStyle} />;
}

export function TextArea(props) {
  return <textarea {...props} className={`${inputBase} ${props.className || ''}`} style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} />;
}

export function Select({ children, ...props }) {
  return (
    <div className="relative">
      <select {...props} className={`${inputBase} appearance-none pl-8 pr-3`} style={inputStyle}>
        {children}
      </select>
      <ChevronDown size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.inkSoft }} />
    </div>
  );
}

const BADGE_TONES = {
  forest: { bg: '#E3E8DD', fg: C.forestDark },
  ochre: { bg: C.ochreSoft, fg: '#6B4C16' },
  rust: { bg: C.rustSoft, fg: C.rust },
  good: { bg: C.greenGoodSoft, fg: C.greenGood },
  amber: { bg: C.amberSoft, fg: '#6B4C16' },
};

export function Badge({ children, tone = 'forest' }) {
  const t = BADGE_TONES[tone];
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap" style={{ background: t.bg, color: t.fg }}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONE[status] || 'forest'}>{status}</Badge>;
}

export function IconButton({ icon: Icon, onClick, title, tone = 'ghost', size = 15 }) {
  const color = tone === 'danger' ? C.rust : C.inkSoft;
  return (
    <button type="button" onClick={onClick} title={title} className="p-1.5 rounded-md hover:opacity-70 transition-opacity" style={{ color }}>
      <Icon size={size} />
    </button>
  );
}

export function Card({ children, title, right }) {
  return (
    <div className="rounded-xl p-5 mb-4" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
      {(title || right) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-sm font-bold" style={{ color: C.forestDark }}>{title}</h3>}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, width = 'max-w-2xl' }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: '#1A1F1650' }} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`w-full ${width} flex flex-col rounded-2xl shadow-2xl`} style={{ background: C.surface, border: `1px solid ${C.line}`, maxHeight: '85vh' }}>
        <div className="flex items-center justify-between px-6 py-4 shrink-0 rounded-t-2xl" style={{ background: C.forest }}>
          <h2 className="text-white font-bold" style={{ fontFamily: 'Rubik, sans-serif' }}>{title}</h2>
          <button onClick={onClose} className="text-white opacity-80 hover:opacity-100"><X size={18} /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-6 py-4 border-t shrink-0 flex justify-end gap-2" style={{ borderColor: C.line }}>{footer}</div>}
      </div>
    </div>
  );
}

export function ToggleSwitch({ value, onChange, leftLabel, rightLabel, leftValue, rightValue }) {
  return (
    <div className="inline-flex rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
      <button type="button" onClick={() => onChange(rightValue)} className="px-3 py-2 text-xs font-semibold" style={value === rightValue ? { background: C.forest, color: '#fff' } : { background: C.surface, color: C.inkSoft }}>{rightLabel}</button>
      <button type="button" onClick={() => onChange(leftValue)} className="px-3 py-2 text-xs font-semibold" style={value === leftValue ? { background: C.forest, color: '#fff' } : { background: C.surface, color: C.inkSoft }}>{leftLabel}</button>
    </div>
  );
}

export function ActiveScheduleToggle({ value, onChange }) {
  const Dot = ({ active }) => <span className="inline-block w-3 h-3 rounded-full" style={{ border: `2px solid ${active ? '#fff' : C.inkSoft}`, background: active ? C.ochreSoft : 'transparent' }} />;
  return (
    <div className="grid grid-cols-2 rounded-lg overflow-hidden w-full" style={{ border: `1px solid ${C.line}` }}>
      <button type="button" onClick={() => onChange('original')} className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold" style={value === 'original' ? { background: C.forest, color: '#fff' } : { background: C.surface, color: C.inkSoft }}><Dot active={value === 'original'} />במועד המקורי</button>
      <button type="button" onClick={() => onChange('backup')} className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold" style={value === 'backup' ? { background: C.forest, color: '#fff' } : { background: C.surface, color: C.inkSoft }}><Dot active={value === 'backup'} />במועד החלופי</button>
    </div>
  );
}

export function AudienceBubbleSelect({ value, onChange, rows }) {
  function toggle(opt) { onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]); }
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row, ri) => (
        <div key={ri} className="flex flex-wrap gap-2">
          {row.map(opt => {
            const active = value.includes(opt);
            return (
              <button type="button" key={opt} onClick={() => toggle(opt)}
                className="text-xs font-semibold rounded-full px-3.5 py-1.5 transition-all"
                style={active ? { background: C.forest, color: '#fff', border: `1.5px solid ${C.forest}`, boxShadow: `0 0 0 2px ${C.ochreSoft}` } : { background: C.surface, color: C.inkSoft, border: `1.5px solid ${C.line}` }}>
                {opt}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function MunicipalitySelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  function toggleMuni(name) { onChange(value.includes(name) ? value.filter(v => v !== name) : [...value, name]); }
  function toggleDistrict(d) { const all = DISTRICTS[d]; const allSel = all.every(m => value.includes(m)); onChange(allSel ? value.filter(v => !all.includes(v)) : Array.from(new Set([...value, ...all]))); }
  const allSelected = ALL_MUNICIPALITIES.every(m => value.includes(m));
  function toggleAll() { onChange(allSelected ? [] : [...ALL_MUNICIPALITIES]); }
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)} className={`${inputBase} flex items-center justify-between`} style={inputStyle}>
        <span className="flex items-center gap-1.5"><MapPin size={14} style={{ color: C.forestLight }} />{value.length ? `${value.length} רשויות נבחרו` : 'בחר רשויות'}</span>
        <ChevronDown size={15} style={{ color: C.inkSoft }} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-80 overflow-y-auto rounded-lg shadow-lg p-2" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          <label className="flex items-center gap-2 px-2 py-1.5 mb-1 rounded-md cursor-pointer font-bold text-sm" style={{ background: C.ochreSoft }}>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />בחר הכל
          </label>
          {Object.entries(DISTRICTS).map(([district, towns]) => {
            const distAllSel = towns.every(t => value.includes(t));
            return (
              <div key={district} className="mb-2 last:mb-0">
                <label className="flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer font-semibold text-xs" style={{ background: '#F2F1E5' }}>
                  <input type="checkbox" checked={distAllSel} onChange={() => toggleDistrict(district)} />{district}
                  <span className="font-normal mr-auto" style={{ color: C.inkSoft }}>בחר מחוז</span>
                </label>
                <div className="pr-2 pt-1 flex flex-col gap-1">
                  {towns.map(town => (
                    <label key={town} className="flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer text-sm hover:bg-black/5">
                      <input type="checkbox" checked={value.includes(town)} onChange={() => toggleMuni(town)} />{town}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ExportButton({ rows, columns, filename }) {
  return (
    <button onClick={() => exportToExcel(rows, columns, filename)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: C.greenGoodSoft, color: C.greenGood }}>
      <FileSpreadsheet size={13} /> ייצוא לאקסל
    </button>
  );
}

// Header cell with an optional sort toggle and a filter popover. `type` is 'text' | 'select' | 'range'.
export function HeaderFilterPopover({ label, type, value, onChange, options, sortKey, activeSortKey, onSort }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const isActive = type === 'text' ? !!value : type === 'select' ? value !== 'all' : Array.isArray(value) ? (value[0] !== '' || value[1] !== '') : false;
  return (
    <div className="relative inline-flex items-center gap-1" ref={ref}>
      {onSort ? (
        <button className="flex items-center gap-1" onClick={() => onSort(sortKey)}>{label}<ArrowUpDown size={11} style={{ opacity: activeSortKey === sortKey ? 1 : 0.4 }} /></button>
      ) : <span>{label}</span>}
      <button onClick={() => setOpen(o => !o)} title="סינון" className="p-0.5 rounded"><Filter size={11} style={{ color: isActive ? C.ochreSoft : 'rgba(255,255,255,0.6)' }} /></button>
      {open && (
        <div onClick={e => e.stopPropagation()} className="absolute z-30 top-full mt-1 right-0 rounded-lg shadow-lg p-3" style={{ background: C.surface, border: `1px solid ${C.line}`, minWidth: 190 }}>
          {type === 'text' && (
            <input autoFocus value={value} onChange={e => onChange(e.target.value)} placeholder="הקלד לסינון..." className="w-full text-xs rounded px-2 py-1.5" style={{ border: `1px solid ${C.line}`, color: C.ink }} />
          )}
          {type === 'select' && (
            <select value={value} onChange={e => onChange(e.target.value)} className="w-full text-xs rounded px-2 py-1.5" style={{ border: `1px solid ${C.line}`, color: C.ink }}>
              <option value="all">הכל</option>
              {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
          {type === 'range' && (
            <div className="flex gap-2 items-center">
              <input type="number" value={value[0]} onChange={e => onChange([e.target.value, value[1]])} placeholder="מ-" className="w-16 text-xs rounded px-2 py-1.5" style={{ border: `1px solid ${C.line}`, color: C.ink }} />
              <span className="text-xs" style={{ color: C.inkSoft }}>עד</span>
              <input type="number" value={value[1]} onChange={e => onChange([value[0], e.target.value])} placeholder="עד" className="w-16 text-xs rounded px-2 py-1.5" style={{ border: `1px solid ${C.line}`, color: C.ink }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Spreadsheet-style editable table: existing rows edit in place, and a "ghost" row at the
// bottom becomes a real row (via onCreate) once you tab/click out of it with its first column
// filled in — no separate add-item form.
//
// For an EXISTING row, `value` only advances once the server confirms the write (it comes
// straight from `rows`, which is the hook's post-round-trip state) — so each cell buffers
// keystrokes in local state and only calls onCommit on blur (immediately for select/boolean,
// which are single discrete actions rather than typing). Without that buffer, a controlled
// input whose value prop lags behind a network round-trip visibly reverts mid-keystroke.
//
// For the GHOST row, `value` IS the parent's local `draft` state (no network round-trip),
// so it can drive the input directly with no local buffer — the thing that needs guarding
// there is different: committing must wait until focus leaves the row entirely (handled by
// the wrapping <tr onBlur>), not fire on every individual cell's blur while tabbing across
// the row, or the row gets created half-filled and the rest of what you type is discarded.
function GridCell({ col, value, isGhost, onChange, onCommit }) {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);
  const display = isGhost ? value : local;

  const cellStyle = { background: 'transparent', border: 'none', width: '100%', padding: '6px 8px', fontSize: 13, outline: 'none', color: C.ink };

  if (col.type === 'select') {
    return (
      <select
        style={cellStyle}
        value={display || ''}
        onChange={e => { const v = e.target.value; setLocal(v); onChange(v); if (!isGhost) onCommit && onCommit(v); }}
      >
        <option value="">{isGhost ? `בחר ${col.label}` : '—'}</option>
        {col.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (col.type === 'boolean') {
    return (
      <button
        type="button"
        onClick={() => { const v = !display; setLocal(v); onChange(v); if (!isGhost) onCommit && onCommit(v); }}
        className="mx-2 px-2.5 py-1 rounded-full text-xs font-semibold"
        style={display ? { background: C.greenGoodSoft, color: C.greenGood, border: `1.5px solid ${C.ink}` } : { background: C.rustSoft, color: C.rust, border: `1.5px solid ${C.ink}` }}
      >
        {display ? 'הושלם' : 'פתוח'}
      </button>
    );
  }
  const type = col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text';
  return (
    <input
      type={type} style={cellStyle} value={display ?? ''}
      placeholder={isGhost ? (col.type === 'number' ? '0' : `+ ${col.label}`) : ''}
      onChange={e => { const v = e.target.value; if (isGhost) { onChange(v); } else { setLocal(v); onChange(v); } }}
      onBlur={() => { if (!isGhost) onCommit && onCommit(local); }}
    />
  );
}

export function InlineGrid({ columns, computedColumns = [], rows, makeEmptyDraft, onCreate, onUpdate, onDelete }) {
  const [draft, setDraft] = useState(makeEmptyDraft());
  const [savingDraft, setSavingDraft] = useState(false);

  function updateGhostDraft(key, value) {
    setDraft(d => ({ ...d, [key]: value }));
  }

  function commitGhostIfReady() {
    const primaryKey = columns[0].key;
    if (savingDraft) return;
    setDraft(current => {
      if (current[primaryKey] === undefined || current[primaryKey] === null || String(current[primaryKey]).trim() === '') return current;
      setSavingDraft(true);
      Promise.resolve(onCreate(current)).finally(() => setSavingDraft(false));
      return makeEmptyDraft();
    });
  }

  const display = [...rows, null];

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ background: C.forest }}>
            {columns.map(col => <th key={col.key} className="text-right px-3 py-2 text-xs font-semibold text-white">{col.label}</th>)}
            {computedColumns.map(col => <th key={col.key} className="text-right px-3 py-2 text-xs font-semibold text-white">{col.label}</th>)}
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody>
          {display.map((row, idx) => {
            const isGhost = row === null;
            const rowKey = isGhost ? 'ghost-row' : row.id;
            return (
              <tr
                key={rowKey}
                onBlur={isGhost ? (e => { if (!e.currentTarget.contains(e.relatedTarget)) commitGhostIfReady(); }) : undefined}
                style={{ background: isGhost ? '#FAFAF3' : (idx % 2 ? '#F7F6EE' : C.surface), borderTop: `1px solid ${C.line}` }}
              >
                {columns.map(col => (
                  <td key={col.key} className="px-1 py-1 align-top">
                    <GridCell
                      col={col}
                      value={isGhost ? draft[col.key] : row[col.key]}
                      isGhost={isGhost}
                      onChange={v => (isGhost ? updateGhostDraft(col.key, v) : undefined)}
                      onCommit={!isGhost ? v => onUpdate(row.id, { [col.key]: v }) : undefined}
                    />
                  </td>
                ))}
                {computedColumns.map(col => (
                  <td key={col.key} className="px-3 py-2 text-xs font-semibold align-top" style={{ color: C.forestDark }}>{isGhost ? '' : col.compute(row)}</td>
                ))}
                <td className="text-center align-top">{!isGhost && <IconButton icon={Trash2} tone="danger" onClick={() => onDelete(row.id)} title="מחק שורה" />}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
