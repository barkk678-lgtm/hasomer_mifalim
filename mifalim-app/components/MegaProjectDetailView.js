'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Plus, Trash2, Link2 } from 'lucide-react';
import { useMegaProject } from '../lib/useMegaProject';
import { useBudget } from '../lib/useBudget';
import { C, ALL_TYPES } from '../lib/designSystem';
import { StatusBadge, IconButton, TextInput, Card, Modal } from './ui';

function money(n) {
  return (Number(n) || 0).toLocaleString('he-IL', { maximumFractionDigits: 0 }) + ' ₪';
}

function LinkMifalModal({ open, onClose, allMifalim, linkedIds, onLink, onUnlink }) {
  return (
    <Modal open={open} onClose={onClose} title="שיוך מפעלים לפרויקט העל" footer={<button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: C.forest }}>סגירה</button>}>
      <div className="rounded-lg overflow-hidden max-h-96 overflow-y-auto" style={{ border: `1px solid ${C.line}` }}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: '#E3E4D6' }}>
              <th className="w-10"></th>
              <th className="text-right px-3 py-2 text-xs font-semibold" style={{ color: C.forestDark }}>שם המפעל</th>
              <th className="text-right px-3 py-2 text-xs font-semibold" style={{ color: C.forestDark }}>סוג</th>
            </tr>
          </thead>
          <tbody>
            {allMifalim.map(m => {
              const linked = linkedIds.includes(m.id);
              const def = ALL_TYPES[m.type] || {};
              return (
                <tr key={m.id} style={{ borderTop: `1px solid ${C.line}` }}>
                  <td className="px-3 py-2 text-center">
                    <input type="checkbox" checked={linked} onChange={() => (linked ? onUnlink(m.id) : onLink(m.id))} />
                  </td>
                  <td className="px-3 py-2 font-medium" style={{ color: C.forestDark }}>{m.name}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: C.inkSoft }}>{def.label || m.type}</td>
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
  const { megaProject, linkedMifalim, allMifalim, loading, linkMifal, unlinkMifal } = useMegaProject(megaProjectId);
  const { income, expenses, loading: budgetLoading, addIncome, deleteIncome, addExpense, deleteExpense } = useBudget('mega_project', megaProjectId);
  const [linkOpen, setLinkOpen] = useState(false);
  const [incomeSource, setIncomeSource] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [expenseName, setExpenseName] = useState('');
  const [expenseQty, setExpenseQty] = useState('');
  const [expenseUnit, setExpenseUnit] = useState('');

  if (loading) return <p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p>;
  if (!megaProject) return <p className="text-sm" style={{ color: C.rust }}>הפרויקט לא נמצא.</p>;

  const ownIncome = income.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const ownExpenses = expenses.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unit_price) || 0), 0);
  const balance = ownIncome - ownExpenses;

  async function handleAddIncome(e) {
    e.preventDefault();
    if (!incomeSource.trim()) return;
    await addIncome({ source_name: incomeSource.trim(), amount: Number(incomeAmount) || 0 });
    setIncomeSource(''); setIncomeAmount('');
  }
  async function handleAddExpense(e) {
    e.preventDefault();
    if (!expenseName.trim()) return;
    await addExpense({ expense_name: expenseName.trim(), quantity: Number(expenseQty) || 0, unit_price: Number(expenseUnit) || 0 });
    setExpenseName(''); setExpenseQty(''); setExpenseUnit('');
  }

  return (
    <div>
      <Link href="/mega" className="flex items-center gap-1.5 text-sm font-medium mb-4" style={{ color: C.inkSoft }}><ArrowRight size={15} /> חזרה לפרויקטי על</Link>

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold" style={{ fontFamily: 'Rubik, sans-serif', color: C.forestDark }}>{megaProject.name}</h1>
      </div>

      <div className="flex gap-2 mb-5">
        <div className="flex-1 rounded-xl p-3.5 text-center" style={{ background: C.greenGoodSoft, border: `1px solid ${C.greenGood}40` }}>
          <div className="text-[10px] font-semibold" style={{ color: C.greenGood }}>סה"כ הכנסה (פרויקט על בלבד)</div>
          <div className="text-base font-bold" style={{ color: C.greenGood }}>{money(ownIncome)}</div>
        </div>
        <div className="flex-1 rounded-xl p-3.5 text-center" style={{ background: C.rustSoft, border: `1px solid ${C.rust}40` }}>
          <div className="text-[10px] font-semibold" style={{ color: C.rust }}>סה"כ הוצאה</div>
          <div className="text-base font-bold" style={{ color: C.rust }}>{money(ownExpenses)}</div>
        </div>
        <div className="flex-1 rounded-xl p-3.5 text-center" style={{ background: balance >= 0 ? C.greenGoodSoft : C.rustSoft, border: `1px solid ${(balance >= 0 ? C.greenGood : C.rust)}40` }}>
          <div className="text-[10px] font-semibold" style={{ color: balance >= 0 ? C.greenGood : C.rust }}>יתרה</div>
          <div className="text-base font-bold" style={{ color: balance >= 0 ? C.greenGood : C.rust }}>{money(balance)}</div>
        </div>
      </div>

      <LinkMifalModal open={linkOpen} onClose={() => setLinkOpen(false)} allMifalim={allMifalim} linkedIds={linkedMifalim.map(m => m.id)} onLink={linkMifal} onUnlink={unlinkMifal} />

      <Card title='דו"ח מפעלים' right={
        <button onClick={() => setLinkOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: C.forest }}><Link2 size={13} /> שייך מפעל</button>
      }>
        {linkedMifalim.length === 0 ? (
          <p className="text-xs" style={{ color: C.inkSoft }}>אין עדיין מפעלים משויכים. השתמשו בכפתור "שייך מפעל".</p>
        ) : (
          <div className="flex flex-col gap-2">
            {linkedMifalim.map(m => (
              <div key={m.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ border: `1px solid ${C.line}` }}>
                <Link href={`/mifal/${m.id}`} className="text-sm font-semibold hover:underline" style={{ color: C.forestDark }}>{m.name}</Link>
                <div className="flex items-center gap-2">
                  <StatusBadge status={m.status} />
                  <IconButton icon={Trash2} tone="danger" onClick={() => unlinkMifal(m.id)} title="ביטול שיוך" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {budgetLoading ? null : (
        <>
          <Card title="הכנסות (על)">
            <form onSubmit={handleAddIncome} className="flex flex-wrap gap-2 mb-3">
              <TextInput value={incomeSource} onChange={e => setIncomeSource(e.target.value)} placeholder="מקור ההכנסה" className="flex-1 min-w-[160px]" />
              <TextInput type="number" value={incomeAmount} onChange={e => setIncomeAmount(e.target.value)} placeholder="סכום" className="w-32" />
              <button type="submit" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: C.forest }}><Plus size={15} /> הוספה</button>
            </form>
            {income.length === 0 ? <p className="text-sm" style={{ color: C.inkSoft }}>אין הכנסות עדיין.</p> : (
              <table className="w-full text-sm border-collapse">
                <tbody>
                  {income.map(r => (
                    <tr key={r.id} style={{ borderTop: `1px solid ${C.line}` }}>
                      <td className="px-4 py-2">{r.source_name}</td>
                      <td className="px-4 py-2 font-semibold" style={{ color: C.forestDark }}>{money(r.amount)}</td>
                      <td className="px-2 py-2 text-center"><IconButton icon={Trash2} tone="danger" onClick={() => deleteIncome(r.id)} title="מחיקה" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title="הוצאות (על)">
            <form onSubmit={handleAddExpense} className="flex flex-wrap gap-2 mb-3">
              <TextInput value={expenseName} onChange={e => setExpenseName(e.target.value)} placeholder="תיאור ההוצאה" className="flex-1 min-w-[160px]" />
              <TextInput type="number" value={expenseQty} onChange={e => setExpenseQty(e.target.value)} placeholder="כמות" className="w-24" />
              <TextInput type="number" value={expenseUnit} onChange={e => setExpenseUnit(e.target.value)} placeholder="מחיר ליחידה" className="w-32" />
              <button type="submit" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: C.forest }}><Plus size={15} /> הוספה</button>
            </form>
            {expenses.length === 0 ? <p className="text-sm" style={{ color: C.inkSoft }}>אין הוצאות עדיין.</p> : (
              <table className="w-full text-sm border-collapse">
                <tbody>
                  {expenses.map(r => (
                    <tr key={r.id} style={{ borderTop: `1px solid ${C.line}` }}>
                      <td className="px-4 py-2">{r.expense_name}</td>
                      <td className="px-4 py-2 text-xs" style={{ color: C.inkSoft }}>{r.quantity} × {money(r.unit_price)}</td>
                      <td className="px-4 py-2 font-semibold" style={{ color: C.forestDark }}>{money((Number(r.quantity) || 0) * (Number(r.unit_price) || 0))}</td>
                      <td className="px-2 py-2 text-center"><IconButton icon={Trash2} tone="danger" onClick={() => deleteExpense(r.id)} title="מחיקה" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
