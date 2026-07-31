'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Plus, Trash2, ListChecks, Wallet } from 'lucide-react';
import { useMifal } from '../lib/useMifal';
import { useMifalTasks } from '../lib/useMifalTasks';
import { useBudget } from '../lib/useBudget';
import { C, ALL_TYPES } from '../lib/designSystem';
import { InfoField, StatusBadge, TextInput, IconButton, Card } from './ui';

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function money(n) {
  return (Number(n) || 0).toLocaleString('he-IL', { maximumFractionDigits: 0 }) + ' ₪';
}

function dateRangeLabel(m) {
  const single = m.type === 'day_trip';
  const start = m.date_mode === 'backup' ? (single ? m.backup_date : m.backup_start_date) : (single ? m.event_date : m.start_date);
  const end = single ? start : (m.date_mode === 'backup' ? m.backup_end_date : m.end_date);
  if (!start) return '—';
  return single ? formatDate(start) : `${formatDate(start) || '?'}-${formatDate(end) || '?'}`;
}

function TasksTab({ mifalId }) {
  const { tasks, loading, createTask, updateTask, deleteTask } = useMifalTasks(mifalId);
  const [taskName, setTaskName] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');

  async function handleAdd(e) {
    e.preventDefault();
    if (!taskName.trim()) return;
    await createTask({ task_name: taskName.trim(), assigned_to: assignedTo, deadline: deadline || null, is_completed: false });
    setTaskName(''); setAssignedTo(''); setDeadline('');
  }

  return (
    <Card title="משימות">
      <form onSubmit={handleAdd} className="flex flex-wrap gap-2 mb-4">
        <TextInput value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="שם המשימה" className="flex-1 min-w-[160px]" />
        <TextInput value={assignedTo} onChange={e => setAssignedTo(e.target.value)} placeholder="אחראי" className="w-40" />
        <TextInput type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-40" />
        <button type="submit" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: C.forest }}><Plus size={15} /> הוספה</button>
      </form>
      {loading ? (
        <p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm" style={{ color: C.inkSoft }}>אין משימות עדיין.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: '#E3E4D6' }}>
              {['משימה', 'אחראי', 'תאריך יעד', 'סטטוס', ''].map(h => (
                <th key={h} className="text-right px-4 py-2 text-xs font-semibold" style={{ color: C.forestDark }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.map(t => (
              <tr key={t.id} style={{ borderTop: `1px solid ${C.line}` }}>
                <td className="px-4 py-2.5">{t.task_name}</td>
                <td className="px-4 py-2.5 text-xs" style={{ color: C.inkSoft }}>{t.assigned_to || '—'}</td>
                <td className="px-4 py-2.5 text-xs">{formatDate(t.deadline)}</td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => updateTask(t.id, { is_completed: !t.is_completed })}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={t.is_completed ? { background: C.greenGoodSoft, color: C.greenGood, border: `1.5px solid ${C.ink}` } : { background: C.rustSoft, color: C.rust, border: `1.5px solid ${C.ink}` }}
                  >
                    {t.is_completed ? 'הושלם' : 'פתוח'}
                  </button>
                </td>
                <td className="px-2 py-2.5 text-center"><IconButton icon={Trash2} tone="danger" onClick={() => deleteTask(t.id)} title="מחיקה" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function BudgetTab({ mifalId }) {
  const { income, expenses, loading, addIncome, deleteIncome, addExpense, deleteExpense } = useBudget('mifal', mifalId);
  const [incomeSource, setIncomeSource] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [expenseName, setExpenseName] = useState('');
  const [expenseQty, setExpenseQty] = useState('');
  const [expenseUnit, setExpenseUnit] = useState('');

  const totalIncome = income.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalExpenses = expenses.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unit_price) || 0), 0);
  const balance = totalIncome - totalExpenses;

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

  if (loading) return <p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p>;

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <div className="flex-1 rounded-xl p-3.5 text-center" style={{ background: C.greenGoodSoft, border: `1px solid ${C.greenGood}40` }}>
          <div className="text-[10px] font-semibold" style={{ color: C.greenGood }}>סה"כ הכנסה</div>
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

      <Card title="הכנסות">
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

      <Card title="הוצאות">
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
    </div>
  );
}

export default function MifalDetailView({ mifalId }) {
  const { mifal, loading } = useMifal(mifalId);
  const [tab, setTab] = useState('tasks');

  if (loading) return <p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p>;
  if (!mifal) return <p className="text-sm" style={{ color: C.rust }}>המפעל לא נמצא.</p>;

  const def = ALL_TYPES[mifal.type] || {};
  const Icon = def.icon;

  return (
    <div>
      <Link href="/" className="flex items-center gap-1.5 text-sm font-medium mb-4" style={{ color: C.inkSoft }}><ArrowRight size={15} /> חזרה</Link>

      <div className="rounded-xl p-5 mb-5" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
        <div className="flex items-center gap-2 mb-1">
          {Icon && <Icon size={15} style={{ color: C.forestLight }} />}
          <span className="text-xs font-semibold" style={{ color: C.inkSoft }}>{def.label}</span>
        </div>
        <h1 className="text-xl font-bold mb-4" style={{ fontFamily: 'Rubik, sans-serif', color: C.forestDark }}>{mifal.name || 'מפעל ללא שם'}</h1>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-3">
          <InfoField label="בעל תפקיד אחראי" value={mifal.lead_role} />
          <InfoField label="סטטוס" value={<StatusBadge status={mifal.status} />} />
          <InfoField label="תאריכים" value={dateRangeLabel(mifal)} />
          <InfoField label="מיקום" value={mifal.accommodation} />
          <InfoField label="מסלולים" value={mifal.routes} />
          <InfoField label="הערות" value={mifal.comments} />
        </div>
      </div>

      <div className="flex gap-1 mb-5 border-b" style={{ borderColor: C.line }}>
        <button onClick={() => setTab('tasks')} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold -mb-px" style={tab === 'tasks' ? { color: C.forestDark, borderBottom: `2px solid ${C.ochre}` } : { color: C.inkSoft, borderBottom: '2px solid transparent' }}>
          <ListChecks size={14} /> משימות
        </button>
        <button onClick={() => setTab('budget')} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold -mb-px" style={tab === 'budget' ? { color: C.forestDark, borderBottom: `2px solid ${C.ochre}` } : { color: C.inkSoft, borderBottom: '2px solid transparent' }}>
          <Wallet size={14} /> תקציב
        </button>
      </div>

      {tab === 'tasks' && <TasksTab mifalId={mifal.id} />}
      {tab === 'budget' && <BudgetTab mifalId={mifal.id} />}
    </div>
  );
}
