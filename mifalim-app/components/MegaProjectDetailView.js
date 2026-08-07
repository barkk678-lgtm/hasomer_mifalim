'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Trash2, Link2 } from 'lucide-react';
import { useMegaProject } from '../lib/useMegaProject';
import { useBudget } from '../lib/useBudget';
import { useSuppliers } from '../lib/useSuppliers';
import { C, ALL_TYPES, ACTIVE_STATUSES, EXPENSE_TYPES } from '../lib/designSystem';
import { StatusBadge, Badge, IconButton, Card, Modal, InlineGrid, ExportButton } from './ui';

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

const INCOME_COLUMNS = [
  { key: 'source_name', label: 'מקור ההכנסה', type: 'text' },
  { key: 'amount', label: 'סכום', type: 'number' },
];
function emptyIncomeDraft() { return { source_name: '', amount: '' }; }

const EXPENSE_COLUMNS = [
  { key: 'expense_name', label: 'תיאור ההוצאה', type: 'text' },
  { key: 'supplier_name', label: 'ספק', type: 'creatable-select' },
  { key: 'expense_type', label: 'סוג הוצאה', type: 'ai-select', options: EXPENSE_TYPES },
  { key: 'quantity', label: 'כמות', type: 'number' },
  { key: 'unit_price', label: 'מחיר ליחידה', type: 'number' },
  { key: 'notes', label: 'הערות', type: 'text' },
];
function emptyExpenseDraft() { return { expense_name: '', supplier_name: '', expense_type: '', quantity: '', unit_price: '', notes: '' }; }

function LinkMifalModal({ open, onClose, allMifalim, linkedIds, onLink, onUnlink }) {
  const [showAll, setShowAll] = useState(false);
  const base = showAll ? allMifalim : allMifalim.filter(m => ACTIVE_STATUSES.includes(effectiveStatus(m)));
  const sorted = [...base].sort((a, b) => {
    const da = getRelevantDates(a).start || '', db = getRelevantDates(b).start || '';
    return db.localeCompare(da);
  });

  return (
    <Modal open={open} onClose={onClose} title="שיוך מפעלים לפרויקט העל" footer={<button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: C.forest }}>סגירה</button>}>
      <div className="flex justify-end mb-3">
        <button onClick={() => setShowAll(s => !s)} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: C.ochreSoft, color: '#6B4C16' }}>
          {showAll ? 'הצג פעילים בלבד' : 'הצג הכל'}
        </button>
      </div>
      <div className="rounded-lg overflow-hidden max-h-96 overflow-y-auto" style={{ border: `1px solid ${C.line}` }}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: '#E3E4D6' }}>
              <th className="w-10"></th>
              <th className="text-right px-3 py-2 text-xs font-semibold" style={{ color: C.forestDark }}>שם המפעל</th>
              <th className="text-right px-3 py-2 text-xs font-semibold" style={{ color: C.forestDark }}>סוג</th>
              <th className="text-right px-3 py-2 text-xs font-semibold" style={{ color: C.forestDark }}>שנה</th>
              <th className="text-right px-3 py-2 text-xs font-semibold" style={{ color: C.forestDark }}>סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m, i) => {
              const linked = linkedIds.includes(m.id);
              const def = ALL_TYPES[m.type] || {};
              return (
                <tr key={m.id} style={{ background: i % 2 ? '#FAFAF3' : C.surface, borderTop: `1px solid ${C.line}` }}>
                  <td className="px-3 py-2 text-center">
                    <input type="checkbox" checked={linked} onChange={() => (linked ? onUnlink(m.id) : onLink(m.id))} />
                  </td>
                  <td className="px-3 py-2 font-medium" style={{ color: C.forestDark }}>{m.name}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: C.inkSoft }}>{def.label || m.type}</td>
                  <td className="px-3 py-2 text-xs">{yearOf(m) || '—'}</td>
                  <td className="px-3 py-2"><StatusBadge status={effectiveStatus(m)} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

export default function MegaProjectDetailView({ megaProjectId }) {
  const router = useRouter();
  const { megaProject, linkedMifalim, allMifalim, loading, linkMifal, unlinkMifal, deleteMegaProject } = useMegaProject(megaProjectId);
  const { income, expenses, loading: budgetLoading, addIncome, updateIncome, deleteIncome, addExpense, updateExpense, deleteExpense, budgetError, classifyingIds } = useBudget('mega_project', megaProjectId);
  const { suppliers } = useSuppliers();
  const expenseColumns = EXPENSE_COLUMNS.map(c => (c.key === 'supplier_name' ? { ...c, options: suppliers } : c));
  const [linkOpen, setLinkOpen] = useState(false);

  if (loading) return <p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p>;
  if (!megaProject) return <p className="text-sm" style={{ color: C.rust }}>הפרויקט לא נמצא.</p>;

  const ownIncome = income.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const ownExpenses = expenses.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unit_price) || 0), 0);

  const expIncome = ownIncome + linkedMifalim.reduce((s, m) => s + m.totalExpectedIncome, 0);
  const expExpenses = ownExpenses + linkedMifalim.reduce((s, m) => s + m.totalExpenses, 0);
  const expBalance = expIncome - expExpenses;
  const expParticipants = linkedMifalim.reduce((s, m) => s + m.expectedParticipants, 0);

  const actIncome = ownIncome + linkedMifalim.reduce((s, m) => s + m.totalIncome, 0);
  const actExpenses = ownExpenses + linkedMifalim.reduce((s, m) => s + m.totalExpenses, 0);
  const actBalance = actIncome - actExpenses;
  const actParticipants = linkedMifalim.reduce((s, m) => s + m.participants, 0);

  async function handleDelete() {
    if (!confirm(`האם אתה בטוח שאתה רוצה למחוק את פרויקט העל "${megaProject.name || 'ללא שם'}"?`)) return;
    const ok = await deleteMegaProject();
    if (ok) router.push('/mega');
  }

  return (
    <div>
      <Link href="/mega" className="flex items-center gap-1.5 text-sm font-medium mb-4" style={{ color: C.inkSoft }}><ArrowRight size={15} /> חזרה לפרויקטי על</Link>

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold" style={{ fontFamily: 'Rubik, sans-serif', color: C.forestDark }}>{megaProject.name}</h1>
        <IconButton icon={Trash2} tone="danger" title="מחיקת פרויקט על" onClick={handleDelete} />
      </div>

      <LinkMifalModal open={linkOpen} onClose={() => setLinkOpen(false)} allMifalim={allMifalim.filter(m => m.type !== 'preparation')} linkedIds={linkedMifalim.map(m => m.id)} onLink={linkMifal} onUnlink={unlinkMifal} />

      <div className="flex flex-wrap gap-4 mb-5">
        <div className="flex-1 min-w-[340px]">
          <div className="text-xs font-bold mb-2 text-center py-1 rounded-md" style={{ color: C.forestDark, background: C.ochreSoft }}>תכנון (צפוי)</div>
          <div className="flex gap-2 flex-wrap">
            <div className="rounded-xl p-3.5 flex-1 min-w-[130px]" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              <div className="text-[11px] font-semibold mb-1" style={{ color: C.inkSoft }}>{'סה"כ הכנסה צפויה'}</div>
              <div className="text-base font-bold" style={{ color: C.greenGood }}>{money(expIncome)}</div>
            </div>
            <div className="rounded-xl p-3.5 flex-1 min-w-[130px]" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              <div className="text-[11px] font-semibold mb-1" style={{ color: C.inkSoft }}>{'סה"כ הוצאה צפויה'}</div>
              <div className="text-base font-bold" style={{ color: C.rust }}>{money(expExpenses)}</div>
            </div>
            <div className="rounded-xl p-3.5 flex-1 min-w-[130px]" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              <div className="text-[11px] font-semibold mb-1" style={{ color: C.inkSoft }}>{'סה"כ יתרה צפויה'}</div>
              <div className="text-base font-bold" style={{ color: expBalance >= 0 ? C.greenGood : C.rust }}>{money(expBalance)}</div>
            </div>
            <div className="rounded-xl p-3.5 flex-1 min-w-[130px]" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              <div className="text-[11px] font-semibold mb-1" style={{ color: C.inkSoft }}>{'סה"כ חניכים (צפוי)'}</div>
              <div className="text-base font-bold" style={{ color: C.ink }}>{expParticipants}</div>
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-[340px]">
          <div className="text-xs font-bold mb-2 text-center py-1 rounded-md" style={{ color: C.forestDark, background: C.greenGoodSoft }}>בפועל</div>
          <div className="flex gap-2 flex-wrap">
            <div className="rounded-xl p-3.5 flex-1 min-w-[130px]" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              <div className="text-[11px] font-semibold mb-1" style={{ color: C.inkSoft }}>{'סה"כ הכנסה בפועל'}</div>
              <div className="text-base font-bold" style={{ color: C.greenGood }}>{money(actIncome)}</div>
            </div>
            <div className="rounded-xl p-3.5 flex-1 min-w-[130px]" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              <div className="text-[11px] font-semibold mb-1" style={{ color: C.inkSoft }}>{'סה"כ הוצאה בפועל'}</div>
              <div className="text-base font-bold" style={{ color: C.rust }}>{money(actExpenses)}</div>
            </div>
            <div className="rounded-xl p-3.5 flex-1 min-w-[130px]" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              <div className="text-[11px] font-semibold mb-1" style={{ color: C.inkSoft }}>{'סה"כ יתרה בפועל'}</div>
              <div className="text-base font-bold" style={{ color: actBalance >= 0 ? C.greenGood : C.rust }}>{money(actBalance)}</div>
            </div>
            <div className="rounded-xl p-3.5 flex-1 min-w-[130px]" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
              <div className="text-[11px] font-semibold mb-1" style={{ color: C.inkSoft }}>{'סה"כ חניכים (בפועל)'}</div>
              <div className="text-base font-bold" style={{ color: C.ink }}>{actParticipants}</div>
            </div>
          </div>
        </div>
      </div>

      <Card title='דו"ח מפעלים' right={
        <div className="flex items-center gap-2">
          <button onClick={() => setLinkOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: C.forest }}><Link2 size={13} /> שייך מפעל</button>
          {linkedMifalim.length > 0 && (
            <ExportButton
              rows={linkedMifalim}
              filename="דוח_מפעלים.xlsx"
              columns={[
                { key: 'name', label: 'שם' },
                { key: 'status', label: 'סטטוס', value: effectiveStatus },
                { key: 'expExp', label: 'הוצאות צפויות', value: m => m.totalExpenses },
                { key: 'expP', label: 'חניכים צפויים', value: m => m.expectedParticipants },
                { key: 'expInc', label: 'הכנסות צפויות', value: m => m.totalExpectedIncome },
                { key: 'actExp', label: 'הוצאות בפועל', value: m => m.totalExpenses },
                { key: 'actP', label: 'חניכים בפועל', value: m => m.participants },
                { key: 'actInc', label: 'הכנסות בפועל', value: m => m.totalIncome },
                { key: 'expBal', label: 'יתרה צפויה', value: m => m.expectedBalance },
                { key: 'actBal', label: 'יתרה בפועל', value: m => m.balance },
              ]}
            />
          )}
        </div>
      }>
        {linkedMifalim.length === 0 ? (
          <p className="text-xs" style={{ color: C.inkSoft }}>{'אין עדיין מפעלים משויכים. השתמשו בכפתור "שייך מפעל".'}</p>
        ) : (
          <div className="rounded-lg overflow-x-auto" style={{ border: `1px solid ${C.line}` }}>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: '#E3E4D6' }}>
                  {['שם המפעל', 'סטטוס', 'הוצאות צפויות', 'חניכים צפויים', 'הכנסות צפויות', 'הוצאות בפועל', 'חניכים בפועל', 'הכנסות בפועל', 'יתרה צפויה', 'יתרה בפועל', ''].map(h => (
                    <th key={h} className="text-right px-3 py-2 text-xs font-semibold whitespace-nowrap" style={{ color: C.forestDark }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linkedMifalim.map((m, i) => (
                  <tr key={m.id} style={{ background: i % 2 ? '#FAFAF3' : C.surface, borderTop: `1px solid ${C.line}` }}>
                    <td className="px-3 py-2 font-medium whitespace-nowrap"><Link href={`/mifal/${m.id}`} className="hover:underline" style={{ color: C.forestDark }}>{m.name}</Link></td>
                    <td className="px-3 py-2"><StatusBadge status={effectiveStatus(m)} /></td>
                    <td className="px-3 py-2 whitespace-nowrap">{money(m.totalExpenses)}</td>
                    <td className="px-3 py-2">{m.expectedParticipants}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{money(m.totalExpectedIncome)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{money(m.totalExpenses)}</td>
                    <td className="px-3 py-2">{m.participants}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{money(m.totalIncome)}</td>
                    <td className="px-3 py-2"><Badge tone={m.expectedBalance >= 0 ? 'good' : 'rust'}>{money(m.expectedBalance)}</Badge></td>
                    <td className="px-3 py-2"><Badge tone={m.balance >= 0 ? 'good' : 'rust'}>{money(m.balance)}</Badge></td>
                    <td className="px-2 py-2 text-center"><IconButton icon={Trash2} tone="danger" onClick={() => unlinkMifal(m.id)} title="ביטול שיוך" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {budgetError && (
        <div className="rounded-lg px-3 py-2 mb-3 text-xs" style={{ background: C.rustSoft, color: C.rust, border: `1px solid ${C.rust}` }}>
          {budgetError}
        </div>
      )}

      {budgetLoading ? null : (
        <>
          <Card title="הכנסות (על)">
            <InlineGrid columns={INCOME_COLUMNS} rows={income} makeEmptyDraft={emptyIncomeDraft} onCreate={addIncome} onUpdate={updateIncome} onDelete={deleteIncome} />
          </Card>

          <Card title="הוצאות (על)">
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
        </>
      )}
    </div>
  );
}
