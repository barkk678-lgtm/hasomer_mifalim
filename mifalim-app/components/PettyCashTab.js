'use client';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { usePettyCash } from '../lib/usePettyCash';
import { useSuppliers } from '../lib/useSuppliers';
import { C, EXPENSE_TYPES } from '../lib/designSystem';
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

function TrendTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div dir="rtl" style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 10, padding: '8px 12px', boxShadow: '0 6px 18px rgba(20,30,15,0.12)', fontFamily: 'Heebo, sans-serif', fontSize: 12, textAlign: 'right' }}>
      <div style={{ fontWeight: 700, color: C.forestDark, marginBottom: 3 }}>{p.label}</div>
      <div style={{ color: C.inkSoft }}>יתרה מצטברת: <strong style={{ color: C.forest }}>{money(p.value)}</strong></div>
    </div>
  );
}

// Trend chart is built ONLY from mifal_balance_transfers (they have a real transferred_at) — a
// cumulative running total over time. Direct petty-cash income/expenses (owner_type='general')
// have their own occurred_at too, but are deliberately kept off this chart to keep it simple;
// they're shown in their own tables below and folded into the total-balance KPI instead.
function buildTrendData(transfers) {
  let running = 0;
  const points = transfers.map(t => {
    running += Number(t.amount) || 0;
    return { date: t.transferred_at, label: `${t.mifalim?.name || 'מפעל'} — ${formatDate(t.transferred_at)}`, value: running };
  });
  return points.length > 0 ? [{ date: null, label: 'התחלה', value: 0 }, ...points] : points;
}

const INCOME_COLUMNS = [
  { key: 'source_name', label: 'מקור ההכנסה', type: 'text' },
  { key: 'amount', label: 'סכום', type: 'number' },
  { key: 'occurred_at', label: 'תאריך', type: 'date' },
];
function emptyIncomeDraft() { return { source_name: '', amount: '', occurred_at: todayISO() }; }

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
    transfers, income, expenses, loading, totalBalance, transfersTotal, incomeTotal, expensesTotal,
    addIncome, updateIncome, deleteIncome, addExpense, updateExpense, deleteExpense,
    pettyCashError, classifyingIds,
  } = usePettyCash();
  const { suppliers } = useSuppliers();
  const expenseColumns = EXPENSE_COLUMNS.map(c => (c.key === 'supplier_name' ? { ...c, options: suppliers } : c));

  const trendData = useMemo(() => buildTrendData(transfers), [transfers]);

  if (loading) return <p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p>;

  return (
    <div>
      {pettyCashError && (
        <div className="rounded-lg px-3 py-2 mb-3 text-xs" style={{ background: C.rustSoft, color: C.rust, border: `1px solid ${C.rust}` }}>
          {pettyCashError}
        </div>
      )}

      <div className="flex gap-2 mb-5 flex-wrap">
        <div className="flex-1 min-w-[180px] rounded-xl p-3.5 text-center" style={{ background: totalBalance >= 0 ? C.greenGoodSoft : C.rustSoft, border: `1px solid ${(totalBalance >= 0 ? C.greenGood : C.rust)}40` }}>
          <div className="text-[10px] font-semibold" style={{ color: totalBalance >= 0 ? C.greenGood : C.rust }}>יתרת קופה קטנה כוללת</div>
          <div className="text-xl font-bold" style={{ color: totalBalance >= 0 ? C.greenGood : C.rust }}>{money(totalBalance)}</div>
        </div>
        <div className="flex-1 min-w-[160px] rounded-xl p-3.5 text-center" style={{ background: C.steelSoft, border: `1px solid ${C.steel}40` }}>
          <div className="text-[10px] font-semibold" style={{ color: C.steel }}>מהעברות סגירת מפעלים</div>
          <div className="text-base font-bold" style={{ color: C.steel }}>{money(transfersTotal)}</div>
        </div>
        <div className="flex-1 min-w-[160px] rounded-xl p-3.5 text-center" style={{ background: C.greenGoodSoft, border: `1px solid ${C.greenGood}40` }}>
          <div className="text-[10px] font-semibold" style={{ color: C.greenGood }}>הכנסות ישירות</div>
          <div className="text-base font-bold" style={{ color: C.greenGood }}>{money(incomeTotal)}</div>
        </div>
        <div className="flex-1 min-w-[160px] rounded-xl p-3.5 text-center" style={{ background: C.rustSoft, border: `1px solid ${C.rust}40` }}>
          <div className="text-[10px] font-semibold" style={{ color: C.rust }}>הוצאות ישירות</div>
          <div className="text-base font-bold" style={{ color: C.rust }}>{money(expensesTotal)}</div>
        </div>
      </div>

      <div className="rounded-2xl p-5 mb-5" style={{ background: '#fff', border: `1px solid ${C.line}`, boxShadow: '0 1px 3px rgba(20,30,15,0.06), 0 1px 2px rgba(20,30,15,0.04)' }}>
        <h4 className="text-sm font-bold mb-1" style={{ color: C.forestDark, fontFamily: 'Rubik, sans-serif' }}>מגמת יתרה — לפי העברות סגירת מפעלים</h4>
        <p className="text-[11px] mb-3" style={{ color: C.inkSoft }}>יתרה מצטברת לאורך זמן, מבוססת על העברות מסגירת מפעלים בלבד</p>
        {trendData.length === 0 ? (
          <div className="flex items-center justify-center text-sm rounded-xl" style={{ height: 220, color: C.inkSoft, background: C.paper }}>עדיין לא הועברו יתרות מסגירת מפעלים</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendData} margin={{ top: 20, right: 10, left: 15, bottom: 10 }}>
              <defs>
                <linearGradient id="pcTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.forest} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={C.forest} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={C.line} strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: 'Heebo', fill: C.inkSoft }} axisLine={{ stroke: C.line }} tickLine={false} interval="preserveStartEnd" />
              <YAxis width={85} tick={<PCYAxisTick />} axisLine={{ stroke: C.line }} tickLine={false} />
              <Tooltip content={<TrendTooltip />} />
              <Area type="monotone" dataKey="value" stroke={C.forest} strokeWidth={2} fill="url(#pcTrendFill)" isAnimationActive animationDuration={400} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <Card title="הכנסות ישירות">
        <InlineGrid
          columns={INCOME_COLUMNS}
          rows={income}
          makeEmptyDraft={emptyIncomeDraft}
          onCreate={addIncome}
          onUpdate={updateIncome}
          onDelete={deleteIncome}
        />
      </Card>

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
        {transfers.length === 0 ? (
          <div className="text-center py-8 rounded-xl" style={{ background: C.paper, color: C.inkSoft }}>עדיין לא הועברו יתרות מסגירת מפעלים</div>
        ) : (
          <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: C.forest }}>
                  {['מפעל', 'סכום', 'הערה', 'תאריך'].map(h => <th key={h} className="text-right px-3 py-2 text-xs font-semibold text-white">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {[...transfers].reverse().map((t, i) => (
                  <tr key={t.id} style={{ background: i % 2 ? '#F7F6EE' : C.surface, borderTop: `1px solid ${C.line}` }}>
                    <td className="px-3 py-2"><button onClick={() => router.push(`/mifal/${t.mifal_id}`)} className="hover:underline font-semibold" style={{ color: C.forestDark }}>{t.mifalim?.name || 'מפעל שנמחק'}</button></td>
                    <td className="px-3 py-2"><Badge tone={Number(t.amount) >= 0 ? 'good' : 'rust'}>{money(t.amount)}</Badge></td>
                    <td className="px-3 py-2 text-xs" style={{ color: C.inkSoft }}>{t.note || '—'}</td>
                    <td className="px-3 py-2 text-xs">{formatDate(t.transferred_at)}</td>
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
