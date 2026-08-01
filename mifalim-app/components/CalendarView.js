'use client';
import { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { C, NUMFONT, HOLIDAYS } from '../lib/designSystem';

const HEB_WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

function toDateOnly(d) { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; }
function diffDays(a, b) { return Math.round((toDateOnly(b) - toDateOnly(a)) / 86400000); }
function toISO(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function isSingleDateType(m) { return m.type === 'day_trip' || (m.type === 'preparation' && m.prep_date_mode === 'single'); }

function buildEvents(mifalim) {
  const events = [];
  mifalim.forEach(m => {
    const single = isSingleDateType(m);
    const origStart = single ? m.event_date : m.start_date;
    const origEnd = single ? m.event_date : m.end_date;
    const tone = m.type === 'preparation' ? 'preparation' : 'original';
    if (origStart) events.push({ mifalId: m.id, label: m.name, tone, start: new Date(origStart), end: new Date(origEnd || origStart) });
    const backStart = single ? m.backup_date : m.backup_start_date;
    const backEnd = single ? m.backup_date : m.backup_end_date;
    if (backStart) events.push({ mifalId: m.id, label: `${m.name} (מועד ב')`, tone: 'backup', start: new Date(backStart), end: new Date(backEnd || backStart) });
    (m.occurrences || []).forEach(occ => {
      if (!occ.start_date) return;
      events.push({ mifalId: m.id, label: `${occ.name} (${m.name})`, tone: 'occurrence', start: new Date(occ.start_date), end: new Date(occ.end_date || occ.start_date) });
    });
  });
  return events;
}

function WeekRow({ days, events, onOpen, isLast }) {
  const weekStart = days[0].date;
  const weekEvents = events.map(ev => {
    const s = Math.max(0, diffDays(weekStart, ev.start));
    const e = Math.min(6, diffDays(weekStart, ev.end));
    return { ...ev, s, e };
  }).filter(ev => diffDays(weekStart, ev.end) >= 0 && diffDays(weekStart, ev.start) <= 6);
  const lanes = [];
  weekEvents.forEach(ev => { let li = lanes.findIndex(lane => lane.every(o => ev.s > o.e || ev.e < o.s)); if (li === -1) { li = lanes.length; lanes.push([]); } lanes[li].push(ev); ev.lane = li; });
  const maxLanes = Math.max(1, lanes.length);
  return (
    <div style={{ borderBottom: isLast ? 'none' : `1px solid ${C.line}` }}>
      {/* rowGap:0 (only columnGap keeps the CSS-grid background-through-gap trick) removes the
          horizontal line that used to cut across each day cell, between the date number and the
          event bars below it — the cell reads as one piece now, day-to-day vertical separators
          are unaffected. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gridTemplateRows: `26px repeat(${maxLanes},20px)`, rowGap: 0, columnGap: 1, padding: 2, background: C.line }}>
        {days.map((d, i) => (
          <div key={i} style={{ gridColumn: i + 1, gridRow: 1, opacity: d.inMonth ? 1 : 0.35, paddingRight: 3, background: C.surface }}>
            <div className="text-xs font-semibold" style={NUMFONT}>{d.date.getDate()}</div>
            {d.holiday && <div className="text-[9px] truncate" style={{ color: C.ochre }}>{d.holiday}</div>}
          </div>
        ))}
        {weekEvents.map((ev, idx) => (
          <button key={idx} onClick={() => onOpen(ev.mifalId)} title={ev.label}
            style={{ gridColumn: `${ev.s + 1} / ${ev.e + 2}`, gridRow: ev.lane + 2, background: ev.tone === 'original' ? C.forest : ev.tone === 'backup' ? C.ochre : ev.tone === 'preparation' ? C.linkBlue : C.steel, color: '#fff', fontSize: 10, borderRadius: 3, padding: '0 5px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', textAlign: 'right' }}>
            {ev.label}
          </button>
        ))}
        {Array.from({ length: maxLanes * 7 }).map((_, idx) => {
          const row = Math.floor(idx / 7) + 2, col = (idx % 7) + 1;
          const occupied = weekEvents.some(ev => ev.lane + 2 === row && col >= ev.s + 1 && col <= ev.e + 1);
          return occupied ? null : <div key={`f${idx}`} style={{ gridColumn: col, gridRow: row, background: C.surface }} />;
        })}
      </div>
    </div>
  );
}

function MonthGrid({ monthDate, events, onOpen, label }) {
  const year = monthDate.getFullYear(), month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(firstOfMonth); gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const allDays = [];
  for (let i = 0; i < 42; i++) { const d = new Date(gridStart); d.setDate(d.getDate() + i); allDays.push({ date: d, inMonth: d.getMonth() === month, holiday: HOLIDAYS[toISO(d)] }); }
  const weeks = []; for (let i = 0; i < 6; i++) weeks.push(allDays.slice(i * 7, i * 7 + 7));

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold" style={{ color: C.forestDark }}>{monthDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}</span>
        {label && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: C.ochreSoft, color: '#6B4C16' }}>{label}</span>}
      </div>
      <div className="grid grid-cols-7 gap-0 rounded-t-lg overflow-hidden" style={{ border: `1px solid ${C.line}`, borderBottom: 'none' }}>
        {HEB_WEEKDAYS.map(w => <div key={w} className="text-center text-xs font-bold py-1.5" style={{ color: '#fff', background: C.forest }}>{w}</div>)}
      </div>
      <div className="rounded-b-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
        {weeks.map((week, i) => <WeekRow key={i} days={week} events={events} onOpen={onOpen} isLast={i === weeks.length - 1} />)}
      </div>
    </div>
  );
}

// Shared, single source of truth for both the master Calendar page and any contextual calendar view.
// Shows the current month plus the following month stacked below it, so a busy end-of-month week
// doesn't need a page/cursor change to see what's coming right after it.
export default function CalendarView({ mifalim, onOpen, cursor: controlledCursor, setCursor: controlledSetCursor }) {
  const [innerCursor, setInnerCursor] = useState(new Date());
  const cursor = controlledCursor || innerCursor;
  const setCursor = controlledSetCursor || setInnerCursor;

  const year = cursor.getFullYear(), month = cursor.getMonth();
  const nextMonthDate = new Date(year, month + 1, 1);
  const events = buildEvents(mifalim);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="p-2 rounded-lg" style={{ border: `1px solid ${C.line}` }}><ChevronRight size={16} /></button>
          <span className="text-sm font-semibold w-32 text-center" style={{ color: C.forestDark }}>{cursor.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="p-2 rounded-lg" style={{ border: `1px solid ${C.line}` }}><ChevronLeft size={16} /></button>
        </div>
        <div className="flex gap-3 text-xs flex-wrap" style={{ color: C.inkSoft }}>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: C.forest }} />מועד מקורי</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: C.ochre }} />מועד ב'</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: C.steel }} />מופע</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: C.linkBlue }} />הכנת מדריכים</span>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <MonthGrid monthDate={cursor} events={events} onOpen={onOpen} />
        <MonthGrid monthDate={nextMonthDate} events={events} onOpen={onOpen} label="החודש הבא" />
      </div>
    </div>
  );
}
