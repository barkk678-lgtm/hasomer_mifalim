'use client';
import { useState, useMemo, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, LabelList, ResponsiveContainer } from 'recharts';
import { useFinancialsData } from '../lib/useFinancialsData';
import { C, NUMFONT, ALL_TYPES } from '../lib/designSystem';
import { Badge, StatusBadge, ToggleSwitch, ExportButton } from './ui';
import CrossFilterDonutChart from './CrossFilterDonutChart';

const FIN_PASTEL_COLORS = ['#A9C7A2', '#E8D2A0', '#E5B3A7'];

function money(n) { return (Number(n) || 0).toLocaleString('he-IL', { maximumFractionDigits: 0 }) + ' ₪'; }
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
function yearOf(m) { const { start } = getRelevantDates(m); return start ? new Date(start).getFullYear() : null; }
// A mega project has no event date of its own — its direct ("own") expenses are scoped to a
// year by when the project record itself was created, so the current/all-years toggle still
// applies consistently to them.
function megaYearOf(mp) { return mp.created_at ? new Date(mp.created_at).getFullYear() : null; }

// Custom Y-axis tick: under dir="rtl", SVG text-anchor is direction-relative, so forcing
// direction:ltr + unicodeBidi:bidi-override makes textAnchor="end" resolve to the visual right.
function FinYAxisTick({ x, y, payload }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-15} y={0} dy={4} textAnchor="end" fill={C.inkSoft} fontSize="11px" fontFamily="Heebo, sans-serif" style={{ direction: 'ltr', unicodeBidi: 'bidi-override' }}>
        {Number(payload.value).toLocaleString('he-IL')}
      </text>
    </g>
  );
}

function FinKPIBlock({ label, value, tone, lines, bordered }) {
  const toneColor = tone === 'good' ? C.greenGood : tone === 'rust' ? C.rust : C.forestDark;
  return (
    <div className="flex-1 min-w-[160px] px-5 py-4" style={{ borderLeft: bordered ? `1px solid ${C.line}` : 'none' }}>
      <div className="text-[11px] font-semibold mb-1.5" style={{ color: C.inkSoft }}>{label}</div>
      {lines ? (
        <div className="flex flex-col gap-0.5">
          {lines.map((l, i) => <div key={i} className="text-sm font-medium" style={{ ...NUMFONT, color: C.inkSoft }}>{l}</div>)}
        </div>
      ) : (
        <div className="text-2xl font-bold" style={{ ...NUMFONT, color: toneColor }}>{value}</div>
      )}
    </div>
  );
}

/* ============================== EXPENSE-TYPE BI ANALYTICS ============================== */
// scopedMegaProjects covers a mega project's OWN direct expenses (not tied to any specific
// linked mifal) — without this they were invisible from the by-expense-type breakdown entirely.
function buildExpenseRecords(scopedMifalim, scopedMegaProjects = []) {
  const records = [];
  scopedMifalim.forEach(m => (m.expenseRows || []).forEach(e => {
    records.push({
      id: `mifal_${m.id}_${e.expense_name}_${e.supplier}_${e.quantity}_${e.unit_price}`,
      ownerKind: 'mifal', ownerId: m.id, ownerName: m.name,
      expense_type: e.expense_type && e.expense_type.trim() ? e.expense_type : 'לא מסווג',
      supplier: e.suppliers?.name && e.suppliers.name.trim() ? e.suppliers.name.trim() : 'לא צוין',
      expense_name: e.expense_name || '',
      total: (Number(e.quantity) || 0) * (Number(e.unit_price) || 0),
    });
  }));
  scopedMegaProjects.forEach(mp => (mp.expenseRows || []).forEach(e => {
    records.push({
      id: `mega_${mp.id}_${e.expense_name}_${e.supplier}_${e.quantity}_${e.unit_price}`,
      ownerKind: 'mega', ownerId: mp.id, ownerName: mp.name,
      expense_type: e.expense_type && e.expense_type.trim() ? e.expense_type : 'לא מסווג',
      supplier: e.suppliers?.name && e.suppliers.name.trim() ? e.suppliers.name.trim() : 'לא צוין',
      expense_name: e.expense_name || '',
      total: (Number(e.quantity) || 0) * (Number(e.unit_price) || 0),
    });
  }));
  return records;
}
function buildExpenseTypeChartData(records) {
  const totals = {};
  records.forEach(r => { totals[r.expense_type] = (totals[r.expense_type] || 0) + r.total; });
  return Object.entries(totals).filter(([, v]) => v > 0).map(([name, value]) => ({ key: name, name, value }));
}
// Top-5 suppliers by total cost (optionally scoped to selected expense types), rest bucketed into "אחר".
function buildTopSuppliersData(records, typeFilters) {
  const source = typeFilters.length === 0 ? records : records.filter(r => typeFilters.includes(r.expense_type));
  const totals = {};
  source.forEach(r => { totals[r.supplier] = (totals[r.supplier] || 0) + r.total; });
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const top5 = sorted.slice(0, 5).map(([name, value]) => ({ name, value, isOther: false }));
  const restSum = sorted.slice(5).reduce((s, [, v]) => s + v, 0);
  return restSum > 0 ? [...top5, { name: 'אחר', value: restSum, isOther: true }] : top5;
}
// 3-level hierarchy: expense type -> supplier -> individual mif'al transactions.
function buildExpenseHierarchy(records) {
  const byType = {};
  records.forEach(r => {
    byType[r.expense_type] = byType[r.expense_type] || { key: r.expense_type, total: 0, suppliers: {} };
    byType[r.expense_type].total += r.total;
    const sup = byType[r.expense_type].suppliers;
    sup[r.supplier] = sup[r.supplier] || { key: r.supplier, total: 0, transactions: [] };
    sup[r.supplier].total += r.total;
    sup[r.supplier].transactions.push(r);
  });
  return Object.values(byType)
    .map(t => ({ ...t, suppliers: Object.values(t.suppliers).sort((a, b) => b.total - a.total) }))
    .sort((a, b) => b.total - a.total);
}

// Manual rotate+translate (not the XAxis angle/textAnchor props) — under dir="rtl", SVG
// text-anchor is direction-relative just like the Y-axis tick above. That fix forced
// direction:ltr to make textAnchor="end" mean visual-right — not an option here (these are
// Hebrew supplier names; forcing ltr would reverse the character order). So instead: keep
// direction explicitly rtl and use textAnchor="start", which is what resolves to visual-right
// under rtl — anchoring the label's pivot at the tick instead of at its far end, which is what
// was swinging the rotated text up into the bars instead of down away from the axis.
function FinXAxisAngledTick({ x, y, payload }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={10} textAnchor="start" transform="rotate(-25)" fill={C.inkSoft} fontSize="11px" fontFamily="Heebo, sans-serif" style={{ direction: 'rtl' }}>
        {payload.value}
      </text>
    </g>
  );
}

function TopSuppliersBarChart({ rows, scopeLabel }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: '#fff', border: `1px solid ${C.line}`, boxShadow: '0 1px 3px rgba(20,30,15,0.06), 0 1px 2px rgba(20,30,15,0.04)' }}>
      <h4 className="text-sm font-bold mb-1" style={{ color: C.forestDark, fontFamily: 'Rubik, sans-serif' }}>ספקים מובילים{scopeLabel ? ` — ${scopeLabel}` : ''}</h4>
      <p className="text-[11px] mb-3" style={{ color: C.inkSoft }}>5 הספקים המובילים לפי עלות (וכל השאר תחת "אחר")</p>
      {rows.length === 0 ? (
        <div className="flex items-center justify-center text-sm rounded-xl" style={{ height: 200, color: C.inkSoft, background: C.paper }}>אין נתוני הוצאות להצגה</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={rows} margin={{ bottom: rows.length > 4 ? 55 : 25, top: 20, left: 15, right: 10 }}>
            <CartesianGrid vertical={false} stroke={C.line} strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={rows.length > 4 ? <FinXAxisAngledTick /> : { fontSize: 11, fontFamily: 'Heebo', fill: C.inkSoft }} interval={0} height={rows.length > 4 ? 55 : 30} />
            <YAxis width={85} tick={<FinYAxisTick />} axisLine={{ stroke: C.line }} tickLine={false} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={350} animationEasing="ease-out">
              {rows.map((r, i) => <Cell key={i} fill={r.isOther ? C.sage : FIN_PASTEL_COLORS[i % FIN_PASTEL_COLORS.length]} />)}
              <LabelList dataKey="value" position="top" formatter={v => v.toLocaleString('he-IL')} style={{ fontFamily: 'Heebo', fontWeight: 700, fontSize: 11, fill: C.forestDark }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function ExpenseDrillDownTable({ hierarchy, onOpenEntity, activeFilters }) {
  const [openTypes, setOpenTypes] = useState({});
  const [openSuppliers, setOpenSuppliers] = useState({});
  function toggleType(key) { setOpenTypes(s => ({ ...s, [key]: !s[key] })); }
  function toggleSupplier(key) { setOpenSuppliers(s => ({ ...s, [key]: !s[key] })); }
  // Clicking a category on the chart above filters straight to it — expand both levels (type +
  // its suppliers) automatically instead of making the user click through two more times.
  useEffect(() => {
    if (!activeFilters || activeFilters.length === 0) return;
    const newOpenTypes = {}, newOpenSuppliers = {};
    hierarchy.forEach(t => {
      newOpenTypes[t.key] = true;
      t.suppliers.forEach(s => { newOpenSuppliers[`${t.key}::${s.key}`] = true; });
    });
    setOpenTypes(newOpenTypes);
    setOpenSuppliers(newOpenSuppliers);
  }, [activeFilters, hierarchy]);
  if (hierarchy.length === 0) return <div className="text-center py-10 rounded-xl" style={{ background: C.surface, border: `1px dashed ${C.line}`, color: C.inkSoft }}>אין נתוני הוצאות להצגה</div>;
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
      <table className="w-full text-sm border-collapse">
        <thead><tr style={{ background: '#E3E4D6' }}>{['שם', 'סה"כ עלות'].map(h => <th key={h} className="text-right px-4 py-2.5 text-xs font-semibold" style={{ color: C.forestDark }}>{h}</th>)}</tr></thead>
        <tbody>
          {hierarchy.map(t => {
            const typeOpen = !!openTypes[t.key];
            return (
              <Fragment key={t.key}>
                <tr style={{ background: C.steelSoft, borderTop: `1px solid ${C.line}` }}>
                  <td className="px-4 py-2.5 font-bold">
                    <button onClick={() => toggleType(t.key)} className="flex items-center gap-1.5" style={{ color: C.forestDark }}>
                      <ChevronDown size={14} style={{ transform: typeOpen ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.15s' }} />
                      {t.key}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 font-bold" style={{ ...NUMFONT, color: C.forestDark }}>{money(t.total)}</td>
                </tr>
                {typeOpen && t.suppliers.map(s => {
                  const supKey = `${t.key}::${s.key}`;
                  const supOpen = !!openSuppliers[supKey];
                  return (
                    <Fragment key={supKey}>
                      <tr style={{ background: C.ochreSoft, borderTop: `1px solid ${C.line}` }}>
                        <td className="px-4 py-2 font-semibold" style={{ paddingRight: 34 }}>
                          <button onClick={() => toggleSupplier(supKey)} className="flex items-center gap-1.5" style={{ color: '#6B4C16' }}>
                            <ChevronDown size={13} style={{ transform: supOpen ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.15s' }} />
                            {s.key}
                          </button>
                        </td>
                        <td className="px-4 py-2 font-semibold" style={{ ...NUMFONT, color: '#6B4C16' }}>{money(s.total)}</td>
                      </tr>
                      {supOpen && s.transactions.map((tr, i) => (
                        <tr key={tr.id + i} style={{ background: i % 2 ? '#FAFAF3' : C.surface, borderTop: `1px solid ${C.line}` }}>
                          <td className="px-4 py-2 text-sm" style={{ paddingRight: 58 }}>
                            <button onClick={() => onOpenEntity(tr.ownerKind, tr.ownerId)} className="hover:underline" style={{ color: C.forestDark }}>{tr.ownerName}</button>
                            <span className="text-xs" style={{ color: C.inkSoft }}> — {tr.expense_name}</span>
                          </td>
                          <td className="px-4 py-2 text-sm" style={NUMFONT}>{money(tr.total)}</td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ============================== ANNUAL FINANCIALS (with mega-project accordion rows) ============================== */
export default function FinancialsPageView() {
  const { mifalim, megaProjects, loading } = useFinancialsData();
  const router = useRouter();
  const onOpen = id => router.push(`/mifal/${id}`);
  const onOpenMega = id => router.push(`/mega/${id}`);

  const [viewMode, setViewMode] = useState('by_mifal'); // 'by_mifal' | 'by_expense_type'
  const [timeScope, setTimeScope] = useState('current'); // 'current' | 'all'
  const [expandedMega, setExpandedMega] = useState({});
  const [expenseTypeFilters, setExpenseTypeFilters] = useState([]);

  const years = useMemo(() => Array.from(new Set(mifalim.map(yearOf).filter(Boolean))).sort(), [mifalim]);
  const thisRealYear = new Date().getFullYear();
  const currentYear = years.includes(thisRealYear) ? thisRealYear : (years[years.length - 1] || null);

  const scopedMifalim = timeScope === 'current' ? mifalim.filter(m => yearOf(m) === currentYear) : mifalim.filter(m => yearOf(m) != null);
  const scopedIds = new Set(scopedMifalim.map(m => m.id));
  const scopedMegaProjectsForExpenses = timeScope === 'current' ? megaProjects.filter(mp => megaYearOf(mp) === currentYear) : megaProjects;

  const totalIncome = scopedMifalim.reduce((s, m) => s + m.totalIncome, 0);
  const totalExpectedIncome = scopedMifalim.reduce((s, m) => s + m.totalExpectedIncome, 0);
  const totalExpenses = scopedMifalim.reduce((s, m) => s + m.totalExpenses, 0);
  const totalBalance = totalIncome - totalExpenses;
  const totalExpectedBalance = totalExpectedIncome - totalExpenses;
  const chartData = [{ name: 'הכנסה בפועל', value: totalIncome }, { name: 'הכנסה צפויה', value: totalExpectedIncome }, { name: 'הוצאות', value: totalExpenses }];

  const megaRows = megaProjects.map(mp => ({ mp, children: mifalim.filter(m => mp.linked_mifal_ids.includes(m.id) && scopedIds.has(m.id)) })).filter(r => r.children.length > 0);
  const linkedScopedIds = new Set(megaRows.flatMap(r => r.children.map(c => c.id)));
  const standaloneScoped = scopedMifalim.filter(m => !linkedScopedIds.has(m.id));

  function toggleMega(id) { setExpandedMega(e => ({ ...e, [id]: !e[id] })); }
  function toggleExpenseType(key) { setExpenseTypeFilters(f => (f.includes(key) ? f.filter(k => k !== key) : [...f, key])); }

  const expenseRecords = useMemo(() => buildExpenseRecords(scopedMifalim, scopedMegaProjectsForExpenses), [scopedMifalim, scopedMegaProjectsForExpenses]);
  const expenseTypeChartData = useMemo(() => buildExpenseTypeChartData(expenseRecords), [expenseRecords]);
  const supplierChartRows = useMemo(() => buildTopSuppliersData(expenseRecords, expenseTypeFilters), [expenseRecords, expenseTypeFilters]);
  const expenseHierarchy = useMemo(() => buildExpenseHierarchy(expenseTypeFilters.length === 0 ? expenseRecords : expenseRecords.filter(r => expenseTypeFilters.includes(r.expense_type))), [expenseRecords, expenseTypeFilters]);
  const supplierScopeLabel = expenseTypeFilters.length === 0 ? '' : expenseTypeFilters.length === 1 ? expenseTypeFilters[0] : `${expenseTypeFilters.length} קטגוריות`;

  const timeScopeLabel = timeScope === 'current' ? (currentYear ? `שנת ${currentYear}` : '') : 'כל השנים';

  if (loading) return <p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Rubik, sans-serif', color: C.forestDark }}>סיכום יתרות שנתי</h1>
        {viewMode === 'by_mifal' && scopedMifalim.length > 0 && (
          <ExportButton
            rows={scopedMifalim}
            filename="יתרות.xlsx"
            columns={[{ key: 'name', label: 'שם' }, { key: 'type', label: 'סוג', value: m => ALL_TYPES[m.type].label }, { key: 'balance', label: 'יתרה', value: m => m.balance }, { key: 'expectedBalance', label: 'יתרה צפויה', value: m => m.expectedBalance }]}
          />
        )}
      </div>

      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <ToggleSwitch value={viewMode} onChange={setViewMode} rightValue="by_mifal" rightLabel="לפי מפעלים" leftValue="by_expense_type" leftLabel="לפי סוגי הוצאות" />
        <ToggleSwitch value={timeScope} onChange={setTimeScope} rightValue="current" rightLabel="שנה נוכחית" leftValue="all" leftLabel="מכל השנים" />
      </div>

      {years.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ background: C.surface, border: `1px dashed ${C.line}`, color: C.inkSoft }}>אין מספיק נתוני תאריכים לחישוב פילוח</div>
      ) : viewMode === 'by_mifal' ? (
        <>
          <div className="rounded-2xl mb-5 overflow-hidden" style={{ background: '#fff', border: `1px solid ${C.line}`, boxShadow: '0 1px 3px rgba(20,30,15,0.06), 0 1px 2px rgba(20,30,15,0.04)' }}>
            <div className="flex flex-wrap" style={{ borderBottom: `1px solid ${C.line}` }}>
              <FinKPIBlock label="יתרה מתוכננת" value={money(totalExpectedBalance)} tone={totalExpectedBalance >= 0 ? 'good' : 'rust'} bordered />
              <FinKPIBlock label="יתרה בפועל" value={money(totalBalance)} tone={totalBalance >= 0 ? 'good' : 'rust'} bordered />
              <FinKPIBlock label='סה"כ הכנסות' lines={[`מתוכנן: ${money(totalExpectedIncome)}`, `בפועל: ${money(totalIncome)}`]} bordered />
              <FinKPIBlock label='סה"כ הוצאות' lines={[`מתוכנן: ${money(totalExpenses)}`, `בפועל: ${money(totalExpenses)}`]} />
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ bottom: 10, top: 20, left: 38, right: 10 }}>
                  <CartesianGrid vertical={false} stroke={C.line} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: 'Heebo', fill: C.inkSoft }} axisLine={{ stroke: C.line }} tickLine={false} />
                  <YAxis width={85} tick={<FinYAxisTick />} axisLine={{ stroke: C.line }} tickLine={false} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={400} animationEasing="ease-out">
                    {chartData.map((_, i) => <Cell key={i} fill={FIN_PASTEL_COLORS[i]} />)}
                    <LabelList dataKey="value" position="top" formatter={v => v.toLocaleString('he-IL')} style={{ fontFamily: 'Heebo', fontWeight: 700, fontSize: 12, fill: C.forestDark }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <h3 className="text-sm font-bold mb-3" style={{ color: C.forestDark }}>מפעלים — {timeScopeLabel}</h3>
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
            <table className="w-full text-sm border-collapse">
              <thead><tr style={{ background: '#E3E4D6' }}>{[...(timeScope === 'all' ? ['שם', 'סוג', 'שנה', 'סטטוס', 'יתרה', 'יתרה צפויה'] : ['שם', 'סוג', 'סטטוס', 'יתרה', 'יתרה צפויה'])].map(h => <th key={h} className="text-right px-4 py-2.5 text-xs font-semibold" style={{ color: C.forestDark }}>{h}</th>)}</tr></thead>
              <tbody>
                {megaRows.map(({ mp, children }) => {
                  const isOpen = !!expandedMega[mp.id];
                  const ownBal = mp.ownIncome - mp.ownExpenses;
                  const collapsedBal = ownBal + children.reduce((s, m) => s + m.balance, 0);
                  const collapsedExpBal = ownBal + children.reduce((s, m) => s + m.expectedBalance, 0);
                  return (
                    <Fragment key={mp.id}>
                      <tr style={{ background: C.steelSoft, borderTop: `1px solid ${C.line}` }}>
                        <td className="px-4 py-2.5 font-bold">
                          <button onClick={() => toggleMega(mp.id)} className="flex items-center gap-1.5" style={{ color: C.forestDark }}>
                            <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.15s' }} />
                            <Layers size={13} style={{ color: C.steel }} />
                            <span onClick={e => { e.stopPropagation(); onOpenMega(mp.id); }} className="hover:underline">{mp.name}</span>
                          </button>
                        </td>
                        <td className="px-4 py-2.5 text-xs" style={{ color: C.inkSoft }}>פרויקט על</td>
                        {timeScope === 'all' && <td className="px-4 py-2.5 text-xs" style={{ color: C.inkSoft }}>—</td>}
                        <td className="px-4 py-2.5 text-xs" style={{ color: C.inkSoft }}>—</td>
                        <td className="px-4 py-2.5"><Badge tone={(isOpen ? ownBal : collapsedBal) >= 0 ? 'good' : 'rust'}>{money(isOpen ? ownBal : collapsedBal)}</Badge></td>
                        <td className="px-4 py-2.5"><Badge tone={(isOpen ? ownBal : collapsedExpBal) >= 0 ? 'good' : 'rust'}>{money(isOpen ? ownBal : collapsedExpBal)}</Badge></td>
                      </tr>
                      {isOpen && children.map((m, i) => (
                        <tr key={m.id} style={{ background: i % 2 ? '#FAFAF3' : C.surface, borderTop: `1px solid ${C.line}` }}>
                          <td className="px-4 py-2.5 font-semibold" style={{ paddingRight: 34 }}><button onClick={() => onOpen(m.id)} className="hover:underline" style={{ color: C.forestDark }}>{m.name}</button></td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: C.inkSoft }}>{ALL_TYPES[m.type].label}</td>
                          {timeScope === 'all' && <td className="px-4 py-2.5 text-xs" style={NUMFONT}>{yearOf(m) || '—'}</td>}
                          <td className="px-4 py-2.5"><StatusBadge status={effectiveStatus(m)} /></td>
                          <td className="px-4 py-2.5"><Badge tone={m.balance >= 0 ? 'good' : 'rust'}>{money(m.balance)}</Badge></td>
                          <td className="px-4 py-2.5"><Badge tone={m.expectedBalance >= 0 ? 'good' : 'rust'}>{money(m.expectedBalance)}</Badge></td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
                {standaloneScoped.map((m, i) => (
                  <tr key={m.id} style={{ background: i % 2 ? '#FAFAF3' : C.surface, borderTop: `1px solid ${C.line}` }}>
                    <td className="px-4 py-2.5 font-semibold"><button onClick={() => onOpen(m.id)} className="hover:underline" style={{ color: C.forestDark }}>{m.name}</button></td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: C.inkSoft }}>{ALL_TYPES[m.type].label}</td>
                    {timeScope === 'all' && <td className="px-4 py-2.5 text-xs" style={NUMFONT}>{yearOf(m) || '—'}</td>}
                    <td className="px-4 py-2.5"><StatusBadge status={effectiveStatus(m)} /></td>
                    <td className="px-4 py-2.5"><Badge tone={m.balance >= 0 ? 'good' : 'rust'}>{money(m.balance)}</Badge></td>
                    <td className="px-4 py-2.5"><Badge tone={m.expectedBalance >= 0 ? 'good' : 'rust'}>{money(m.expectedBalance)}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] mt-2" style={{ color: C.inkSoft }}>מפעלים המשויכים לפרויקט על מוצגים מקוננים תחתיו בלבד ואינם מופיעים שוב כשורה עצמאית.</p>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <CrossFilterDonutChart title="הוצאות לפי סוג" unitLabel="סכום" data={expenseTypeChartData} selected={expenseTypeFilters} onToggle={toggleExpenseType} valueFormatter={money} />
            <TopSuppliersBarChart rows={supplierChartRows} scopeLabel={supplierScopeLabel} />
          </div>
          <h3 className="text-sm font-bold mb-3" style={{ color: C.forestDark }}>פירוט הוצאות היררכי — סוג ← ספק ← מפעל / פרויקט על</h3>
          <ExpenseDrillDownTable hierarchy={expenseHierarchy} onOpenEntity={(kind, id) => (kind === 'mega' ? onOpenMega(id) : onOpen(id))} activeFilters={expenseTypeFilters} />
        </>
      )}
    </div>
  );
}
