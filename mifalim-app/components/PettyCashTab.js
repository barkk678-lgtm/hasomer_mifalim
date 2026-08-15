'use client';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, Cell, LabelList, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { usePettyCash } from '../lib/usePettyCash';
import { useSuppliers } from '../lib/useSuppliers';
import { C, EXPENSE_TYPES, ALL_TYPES } from '../lib/designSystem';
import { Card, Badge, InlineGrid } from './ui';

function money(n) { return (Number(n) || 0).toLocaleString('he-IL', { maximumFractionDigits: 0 }) + ' ₪'; }
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function todayISO() { return new Date().toISOString().slice(0, 10); }

// Same RTL Y-axis-tick fix used on the annual financials charts (FinYAxisTick in
// FinancialsPageView.js) — under dir="rtl", SVG text-anchor is direction-relative, so forcing
// direction:ltr + unicodeBidi:bidi-override makes textAnchor="end" resolve to the visual right.
function PCYAxisTick({ x, y, payload }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-15} y={0} dy={4} textAnchor="end" fill={C.inkSoft} fontSize="11px" fontFamily="Heebo, sans-serif" style={{ direction: 'ltr', unicodeBidi: 'bidi-override' }}>
        {Number(payload.value).toLocaleString('he-IL')}
      </text>
    </g>
  );
}

// One bar per mifal TYPE (day-trip / multi-day / seminar / preparation) — simpler and more
// stable than one bar per individual mifal, and only counts CURRENT transfers (a reopened mifal's
// superseded transfer shouldn't count toward what its type "contributed"). Fixed category order
// (ALL_TYPES' own order), only types that actually have a transfer are shown.
function buildTypeBarData(transfers) {
  const totals = {};
  transfers.filter(t => t.is_current).forEach(t => {
    const typeKey = t.mifalim?.type;
    totals[typeKey] = (totals[typeKey] || 0) + (Number(t.amount) || 0);
  });
  return Object.keys(ALL_TYPES).filter(k => totals[k] !== undefined).map(k => ({ name: ALL_TYPES[k].label, value: totals[k] }));
}

const EXPENSE_COLUMNS = [
  { key: 'expense_name', label: 'תיאור ההוצאה', type: 'text' },
  { key: 'supplier_name', label: 'ספק', type: 'creatable-select' },
  { key: 'expense_type', label: 'סוג הוצאה', type: 'ai-select', options: EXPENSE_TYPES, width: 140 },
  { key: 'quantity', label: 'כמות', type: 'number' },
  { key: 'unit_price', label: 'מחיר ליחידה', type: 'number' },
  { key: 'occurred_at', label: 'תאריך', type: 'date' },
  { key: 'notes', label: 'הערות', type: 'text' },
];
function emptyExpenseDraft() { return { expense_name: '', supplier_name: '', expense_type: '', quantity: '', unit_price: '', occurred_at: todayISO(), notes: '' }; }

export default function PettyCashTab() {
  const router = useRouter();
  const {
    transfers, pendingMifalim, expenses, loading, totalBalance, transfersTotal, expensesTotal,
    addExpense, updateExpense, deleteExpense, pettyCashError, classifyingIds,
  } = usePettyCash();
  const { suppliers } = useSuppliers();
  const expenseColumns = EXPENSE_COLUMNS.map(c => (c.key === 'supplier_name' ? { ...c, options: suppliers } : c));

  const barData = useMemo(() => buildTypeBarData(transfers), [transfers]);
  // A single bar (or two) stretched across a full-width ResponsiveContainer looks broken —
  // cap the chart's width to roughly what the bars actually need, capped between a sane min/max.
  const chartWidth = Math.max(240, Math.min(620, barData.length * 170));

  if (loading) return <p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p>;

  return (
    <div>
      {pettyCashError && (
        <div className="rounded-lg px-3 py-2 mb-3 text-xs" style={{ background: C.rustSoft, color: C.rust, border: `1px solid ${C.rust}` }}>
          {pettyCashError}
        </div>
      )}

      <div className="flex gap-2 mb-5 flex-wrap">
        <div className="flex-1 min-w-[180px] rounded-xl p-3.5 text-center" style={{ background: C.steelSoft, border: `1px solid ${C.steel}40` }}>
          <div className="text-[10px] font-semibold" style={{ color: C.steel }}>הכנסות מיתרות מפעלים</div>
          <div className="text-base font-bold" style={{ color: C.steel }}>{money(transfersTotal)}</div>
        </div>
        <div className="flex-1 min-w-[180px] rounded-xl p-3.5 text-center" style={{ background: C.rustSoft, border: `1px solid ${C.rust}40` }}>
          <div className="text-[10px] font-semibold" style={{ color: C.rust }}>הוצאות ישירות</div>
          <div className="text-base font-bold" style={{ color: C.rust }}>{money(expensesTotal)}</div>
        </div>
        <div className="flex-1 min-w-[180px] rounded-xl p-3.5 text-center" style={{ background: totalBalance >= 0 ? C.greenGoodSoft : C.rustSoft, border: `1px solid ${(totalBalance >= 0 ? C.greenGood : C.rust)}40` }}>
          <div className="text-[10px] font-semibold" style={{ color: totalBalance >= 0 ? C.greenGood : C.rust }}>יתרה</div>
          <div className="text-xl font-bold" style={{ color: totalBalance >= 0 ? C.greenGood : C.rust }}>{money(totalBalance)}</div>
        </div>
      </div>

      <div className="rounded-2xl p-5 mb-5" style={{ background: '#fff', border: `1px solid ${C.line}`, boxShadow: '0 1px 3px rgba(20,30,15,0.06), 0 1px 2px rgba(20,30,15,0.04)' }}>
        <h4 className="text-sm font-bold mb-1" style={{ color: C.forestDark, fontFamily: 'Rubik, sans-serif' }}>יתרות שהועברו לפי סוג מפעל</h4>
        <p className="text-[11px] mb-3" style={{ color: C.inkSoft }}>כמה כסף כל סוג מפעל תרם ליתרת הקופה הקטנה</p>
        {barData.length === 0 ? (
          <div className="flex items-center justify-center text-sm rounded-xl" style={{ height: 200, color: C.inkSoft, background: C.paper }}>עדיין לא הועברו יתרות מסגירת מפעלים</div>
        ) : (
          <div style={{ maxWidth: chartWidth, margin: '0 auto' }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 20, left: 15, right: 10, bottom: 10 }}>
                <CartesianGrid vertical={false} stroke={C.line} strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Heebo', fill: C.inkSoft }} interval={0} />
                <YAxis width={85} tick={<PCYAxisTick />} axisLine={{ stroke: C.line }} tickLine={false} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={350} animationEasing="ease-out" maxBarSize={80}>
                  {barData.map((r, i) => <Cell key={i} fill={r.value >= 0 ? C.greenGood : C.rust} />)}
                  <LabelList dataKey="value" position="top" formatter={v => money(v)} style={{ fontFamily: 'Heebo', fontWeight: 700, fontSize: 11, fill: C.forestDark }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <Card title="הוצאות ישירות">
        <InlineGrid
          columns={expenseColumns}
          computedColumns={[{ key: 'total', label: 'סה"כ', compute: r => money((Number(r.quantity) || 0) * (Number(r.unit_price) || 0)) }]}
          rows={expenses}
          makeEmptyDraft={emptyExpenseDraft}
          onCreate={addExpense}
          onUpdate={updateExpense}
          onDelete={deleteExpense}
          getCellExtra={(row, col) => (col.key === 'expense_type' ? { isClassifying: classifyingIds.has(row.id) } : {})}
        />
      </Card>

      <Card title="העברות מסגירת מפעלים">
        {transfers.length === 0 && pendingMifalim.length === 0 ? (
          <div className="text-center py-8 rounded-xl" style={{ background: C.paper, color: C.inkSoft }}>אין עדיין מפעלים שהסתיימו</div>
        ) : (
          <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: C.forest }}>
                  {['מפעל', 'סכום', 'תאריך סגירת יתרות המפעל', 'יתרה עדכנית?'].map(h => <th key={h} className="text-right px-3 py-2 text-xs font-semibold text-white">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {pendingMifalim.map((m, i) => (
                  <tr key={`pending-${m.id}`} style={{ background: i % 2 ? '#F7F6EE' : C.surface, borderTop: `1px solid ${C.line}` }}>
                    <td className="px-3 py-2"><button onClick={() => router.push(`/mifal/${m.id}`)} className="hover:underline font-semibold" style={{ color: C.forestDark }}>{m.name}</button></td>
                    <td className="px-3 py-2 text-xs" style={{ color: C.inkSoft }}>—</td>
                    <td className="px-3 py-2 text-xs" style={{ color: C.inkSoft }}>—</td>
                    <td className="px-3 py-2"><Badge tone="amber">ממתין</Badge></td>
                  </tr>
                ))}
                {[...transfers].reverse().map((t, i) => (
                  <tr key={t.id} style={{ background: (i + pendingMifalim.length) % 2 ? '#F7F6EE' : C.surface, borderTop: `1px solid ${C.line}` }}>
                    <td className="px-3 py-2"><button onClick={() => router.push(`/mifal/${t.mifal_id}`)} className="hover:underline font-semibold" style={{ color: C.forestDark }}>{t.mifalim?.name || 'מפעל שנמחק'}</button></td>
                    <td className="px-3 py-2"><Badge tone={Number(t.amount) >= 0 ? 'good' : 'rust'}>{money(t.amount)}</Badge></td>
                    <td className="px-3 py-2 text-xs">{formatDate(t.transferred_at)}</td>
                    <td className="px-3 py-2"><Badge tone={t.is_current ? 'good' : 'rust'}>{t.is_current ? 'כן' : 'לא'}</Badge></td>
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
