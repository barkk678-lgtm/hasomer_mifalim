'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Plus, Trash2, ListChecks, Wallet, UserPlus, LayoutGrid, TableIcon } from 'lucide-react';
import { useMifal } from '../lib/useMifal';
import { useMifalTasks } from '../lib/useMifalTasks';
import { useBudget } from '../lib/useBudget';
import { useStakeholders } from '../lib/useStakeholders';
import { usePricingTiers } from '../lib/usePricingTiers';
import { C, ALL_TYPES } from '../lib/designSystem';
import { InfoField, StatusBadge, TextInput, IconButton, Card, Modal } from './ui';

const UNASSIGNED = '__unassigned__';

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
function TasksTab({ mifalId }) {
  const { tasks, loading, createTask, updateTask, deleteTask } = useMifalTasks(mifalId);
  const { stakeholders, createStakeholder, deleteStakeholder } = useStakeholders(mifalId);
  const [layout, setLayout] = useState('kanban');
  const [stakeholdersOpen, setStakeholdersOpen] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');
  const [dragOverLane, setDragOverLane] = useState(null);

  async function handleAdd(e) {
    e.preventDefault();
    if (!taskName.trim()) return;
    await createTask({ task_name: taskName.trim(), assigned_to: assignedTo, deadline: deadline || null, is_completed: false });
    setTaskName(''); setAssignedTo(''); setDeadline('');
  }

  const lanes = [...stakeholders.map(s => ({ id: s.full_name, label: s.full_name || 'ללא שם' })), { id: UNASSIGNED, label: 'לא משויך' }];

  function moveTask(taskId, laneId) {
    updateTask(taskId, { assigned_to: laneId === UNASSIGNED ? '' : laneId });
  }

  return (
    <div>
      <StakeholdersModal open={stakeholdersOpen} onClose={() => setStakeholdersOpen(false)} stakeholders={stakeholders} onCreate={createStakeholder} onDelete={deleteStakeholder} />

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <button onClick={() => setStakeholdersOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: C.forest, color: '#fff' }}>
          <UserPlus size={13} /> בעלי התפקידים במפעל ({stakeholders.length})
        </button>
        <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
          <button onClick={() => setLayout('kanban')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold" style={layout === 'kanban' ? { background: C.forest, color: '#fff' } : { background: C.surface, color: C.inkSoft }}><LayoutGrid size={13} /> קנבן</button>
          <button onClick={() => setLayout('table')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold" style={layout === 'table' ? { background: C.forest, color: '#fff' } : { background: C.surface, color: C.inkSoft }}><TableIcon size={13} /> טבלה</button>
        </div>
      </div>

      <Card title="הוספת משימה">
        <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
          <TextInput value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="שם המשימה" className="flex-1 min-w-[160px]" />
          {stakeholders.length > 0 ? (
            <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="rounded-md px-3 py-2 text-sm" style={{ border: `1px solid ${C.line}` }}>
              <option value="">לא משויך</option>
              {stakeholders.map(s => <option key={s.id} value={s.full_name}>{s.full_name}</option>)}
            </select>
          ) : (
            <TextInput value={assignedTo} onChange={e => setAssignedTo(e.target.value)} placeholder="אחראי" className="w-40" />
          )}
          <TextInput type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-40" />
          <button type="submit" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: C.forest }}><Plus size={15} /> הוספה</button>
        </form>
      </Card>

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
              const laneTasks = tasks.filter(t => (t.assigned_to || '') === (lane.id === UNASSIGNED ? '' : lane.id));
              return (
                <div
                  key={lane.id}
                  onDragOver={e => { e.preventDefault(); setDragOverLane(lane.id); }}
                  onDragLeave={() => setDragOverLane(null)}
                  onDrop={e => { e.preventDefault(); moveTask(e.dataTransfer.getData('text/plain'), lane.id); setDragOverLane(null); }}
                  className="w-64 shrink-0 rounded-xl p-2.5"
                  style={{ background: dragOverLane === lane.id ? '#F5EEDC' : C.paper, border: `1px solid ${C.line}` }}
                >
                  <div className="text-xs font-bold mb-2 px-1" style={{ color: C.forestDark }}>{lane.label} <span className="font-normal" style={{ color: C.inkSoft }}>({laneTasks.length})</span></div>
                  <div className="flex flex-col gap-2">
                    {laneTasks.map(t => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={e => e.dataTransfer.setData('text/plain', t.id)}
                        className="rounded-lg p-2.5 shadow-sm cursor-grab relative"
                        style={t.is_completed ? { background: C.greenGoodSoft, border: `1px solid ${C.greenGood}` } : { background: C.surface, border: `1px solid ${C.line}` }}
                      >
                        <button onClick={() => deleteTask(t.id)} className="absolute top-1.5 left-1.5" style={{ color: C.inkSoft }}><Trash2 size={12} /></button>
                        <div className="text-sm font-semibold mb-1 pl-4">{t.task_name}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px]" style={{ color: C.inkSoft }}>{formatDate(t.deadline)}</span>
                          <button onClick={() => updateTask(t.id, { is_completed: !t.is_completed })} className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={t.is_completed ? { background: C.greenGood, color: '#fff' } : { background: '#fff', color: C.inkSoft, border: `1px solid ${C.line}` }}>
                            {t.is_completed ? 'הושלם' : 'פתוח'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <Card>
          {tasks.length === 0 ? (
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
      )}
    </div>
  );
}

/* ============================== BUDGET TAB (pricing tiers + income + expenses) ============================== */
function PricingTiersSection({ mifalId }) {
  const { tiers, loading, createTier, updateTier, deleteTier } = usePricingTiers(mifalId);
  const [ageGroup, setAgeGroup] = useState('');
  const [price, setPrice] = useState('');
  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState('');

  async function handleAdd(e) {
    e.preventDefault();
    if (!ageGroup.trim()) return;
    await createTier({ age_group: ageGroup.trim(), price_per_participant: Number(price) || 0, expected_participants: Number(expected) || 0, actual_participants: Number(actual) || 0 });
    setAgeGroup(''); setPrice(''); setExpected(''); setActual('');
  }

  return (
    <Card title="הכנסה מהרשמה (רמות תמחור)">
      <form onSubmit={handleAdd} className="flex flex-wrap gap-2 mb-3">
        <TextInput value={ageGroup} onChange={e => setAgeGroup(e.target.value)} placeholder="קבוצת גיל" className="flex-1 min-w-[120px]" />
        <TextInput type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="מחיר למשתתף" className="w-32" />
        <TextInput type="number" value={expected} onChange={e => setExpected(e.target.value)} placeholder="משתתפים צפויים" className="w-32" />
        <TextInput type="number" value={actual} onChange={e => setActual(e.target.value)} placeholder="משתתפים בפועל" className="w-32" />
        <button type="submit" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: C.forest }}><Plus size={15} /> הוספה</button>
      </form>
      {loading ? (
        <p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p>
      ) : tiers.length === 0 ? (
        <p className="text-sm" style={{ color: C.inkSoft }}>אין רמות תמחור עדיין.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: '#E3E4D6' }}>
              {['קבוצת גיל', 'מחיר למשתתף', 'צפויים', 'בפועל', 'הכנסה צפויה', 'הכנסה בפועל', ''].map(h => (
                <th key={h} className="text-right px-3 py-2 text-xs font-semibold" style={{ color: C.forestDark }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tiers.map(t => (
              <tr key={t.id} style={{ borderTop: `1px solid ${C.line}` }}>
                <td className="px-3 py-2">{t.age_group}</td>
                <td className="px-3 py-2 text-xs">{money(t.price_per_participant)}</td>
                <td className="px-3 py-2 text-xs">{t.expected_participants}</td>
                <td className="px-3 py-2 text-xs">{t.actual_participants}</td>
                <td className="px-3 py-2 text-xs font-semibold" style={{ color: C.forestDark }}>{money((Number(t.expected_participants) || 0) * (Number(t.price_per_participant) || 0))}</td>
                <td className="px-3 py-2 text-xs font-semibold" style={{ color: C.forestDark }}>{money((Number(t.actual_participants) || 0) * (Number(t.price_per_participant) || 0))}</td>
                <td className="px-2 py-2 text-center"><IconButton icon={Trash2} tone="danger" onClick={() => deleteTier(t.id)} title="מחיקה" /></td>
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
  const { tiers } = usePricingTiers(mifalId);
  const [incomeSource, setIncomeSource] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [expenseName, setExpenseName] = useState('');
  const [expenseQty, setExpenseQty] = useState('');
  const [expenseUnit, setExpenseUnit] = useState('');

  const tiersIncome = tiers.reduce((s, t) => s + (Number(t.actual_participants) || 0) * (Number(t.price_per_participant) || 0), 0);
  const totalIncome = income.reduce((s, r) => s + (Number(r.amount) || 0), 0) + tiersIncome;
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
        <form onSubmit={handleAddIncome} className="flex flex-wrap gap-2 mb-3">
          <TextInput value={incomeSource} onChange={e => setIncomeSource(e.target.value)} placeholder="מקור ההכנסה" className="flex-1 min-w-[160px]" />
          <TextInput type="number" value={incomeAmount} onChange={e => setIncomeAmount(e.target.value)} placeholder="סכום" className="w-32" />
          <button type="submit" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: C.forest }}><Plus size={15} /> הוספה</button>
        </form>
        {income.length === 0 ? <p className="text-sm" style={{ color: C.inkSoft }}>אין הכנסות נוספות עדיין.</p> : (
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
