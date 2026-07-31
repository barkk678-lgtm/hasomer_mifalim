'use client';
import { useState } from 'react';
import { Plus, Trash2, Bus } from 'lucide-react';
import { useBusPlans } from '../lib/useBusPlans';
import { useBusPlanDetail } from '../lib/useBusPlanDetail';
import { C } from '../lib/designSystem';
import { Card, IconButton, TextInput, Field, InlineGrid } from './ui';

// Groups needing pickup + bus types available — the structured input data an external
// allocation tool reads to compute the actual seating plan. The board itself (which group sits
// on which bus) is out of scope here on purpose: it's computed/maintained by that external tool,
// not edited by hand in this UI.
const GROUP_COLUMNS = [
  { key: 'pickup_point', label: "נק' איסוף", type: 'text' },
  { key: 'group_name', label: 'שם הקבוצה', type: 'text' },
  { key: 'quantity', label: 'כמות', type: 'number' },
];
function emptyGroupDraft() { return { pickup_point: '', group_name: '', quantity: '' }; }

const BUS_TYPE_COLUMNS = [
  { key: 'label', label: 'שם סוג האוטובוס', type: 'text' },
  { key: 'capacity', label: 'קיבולת', type: 'number' },
];
function emptyBusTypeDraft() { return { label: '', capacity: '' }; }

function BusPlanDetail({ plan, onUpdatePlan }) {
  const { busTypes, groups, board, loading, createBusType, updateBusType, deleteBusType, createGroup, updateGroup, deleteGroup } = useBusPlanDetail(plan.id);
  const [destination, setDestination] = useState(plan.destination || '');

  const totalPeople = groups.reduce((s, g) => s + (Number(g.quantity) || 0), 0);
  const totalCapacity = busTypes.reduce((s, t) => s + (Number(t.capacity) || 0), 0);
  const hasBoard = board && board.board && Object.keys(board.board).length > 0;

  if (loading) return <p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p>;

  return (
    <div>
      <Card title="קבוצות">
        <p className="text-xs mb-3" style={{ color: C.inkSoft }}>הזנה ידנית ישירות בטבלה — כל שורה היא קבוצה שצריך לשבץ לאוטובוס.</p>
        <InlineGrid columns={GROUP_COLUMNS} rows={groups} makeEmptyDraft={emptyGroupDraft} onCreate={createGroup} onUpdate={updateGroup} onDelete={deleteGroup} />
        {groups.length > 0 && <p className="text-[11px] mt-2" style={{ color: C.inkSoft }}>{'סה"כ'} {groups.length} קבוצות, {totalPeople} איש.</p>}
      </Card>

      <Card title="סוגי אוטובוסים זמינים">
        <p className="text-xs mb-3" style={{ color: C.inkSoft }}>ניתן להגדיר כמה סוגים בקיבולות שונות.</p>
        <InlineGrid columns={BUS_TYPE_COLUMNS} rows={busTypes} makeEmptyDraft={emptyBusTypeDraft} onCreate={createBusType} onUpdate={updateBusType} onDelete={deleteBusType} />
        {busTypes.length > 0 && <p className="text-[11px] mt-2" style={{ color: C.inkSoft }}>{'סה"כ'} קיבולת: {totalCapacity} מקומות.</p>}
      </Card>

      <Card title="יעד סופי">
        <Field label="יעד סופי">
          <TextInput value={destination} onChange={e => setDestination(e.target.value)} onBlur={() => onUpdatePlan(plan.id, { destination })} placeholder="לדוגמה: כפר הנוער הדסים" />
        </Field>
      </Card>

      <Card title="סידור בפועל">
        {hasBoard ? (
          <p className="text-sm" style={{ color: C.forestDark }}>
            קיים סידור פעיל לתוכנית זו{board.updated_at ? ` (עודכן לאחרונה ${new Date(board.updated_at).toLocaleString('he-IL')})` : ''}.
          </p>
        ) : (
          <p className="text-sm" style={{ color: C.inkSoft }}>טרם חושב סידור אוטובוסים לתוכנית זו.</p>
        )}
      </Card>
    </div>
  );
}

export default function BusLogisticsTab({ mifalId }) {
  const { plans, loading, createPlan, updatePlan, deletePlan } = useBusPlans(mifalId);
  const [activeId, setActiveId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameText, setRenameText] = useState('');

  const activePlan = plans.find(p => p.id === activeId) || plans[0] || null;

  async function addPlan() {
    const p = await createPlan(`תוכנית הסעה ${plans.length + 1}`);
    if (p) setActiveId(p.id);
  }
  function startRename(p) { setRenamingId(p.id); setRenameText(p.name); }
  function confirmRename() {
    if (renameText.trim()) updatePlan(renamingId, { name: renameText.trim() });
    setRenamingId(null);
  }
  function handleDeletePlan(id) {
    deletePlan(id);
    if (activePlan?.id === id) setActiveId(null);
  }

  if (loading) return <p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {plans.map(p => (
          <div key={p.id} className="flex items-center gap-1">
            {renamingId === p.id ? (
              <input autoFocus value={renameText} onChange={e => setRenameText(e.target.value)} onBlur={confirmRename} onKeyDown={e => e.key === 'Enter' && confirmRename()} className="text-xs px-2 py-1.5 rounded-lg" style={{ border: `1px solid ${C.line}` }} />
            ) : (
              <button
                onClick={() => setActiveId(p.id)}
                onDoubleClick={() => startRename(p)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={activePlan?.id === p.id ? { background: C.forest, color: '#fff' } : { background: C.surface, color: C.inkSoft, border: `1px solid ${C.line}` }}
                title="לחיצה כפולה לשינוי שם התוכנית"
              >
                {p.name}
              </button>
            )}
            {activePlan?.id === p.id && <IconButton icon={Trash2} tone="danger" size={13} onClick={() => handleDeletePlan(p.id)} title="מחיקת תוכנית" />}
          </div>
        ))}
        <button onClick={addPlan} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: C.linkBlue, color: '#fff' }}>
          <Plus size={13} /> תוכנית הסעה חדשה
        </button>
      </div>
      <p className="text-[11px] mb-4" style={{ color: C.inkSoft }}>לחיצה כפולה על שם תוכנית משנה אותו (לדוגמה: {'"'}הסעה הלוך – יום א{"'"}{'"'}). לכל תוכנית יעד, סוגי אוטובוסים וקבוצות משלה.</p>

      {!activePlan ? (
        <div className="text-center py-16 rounded-xl" style={{ background: C.surface, border: `1px dashed ${C.line}`, color: C.inkSoft }}>
          <Bus size={28} className="mx-auto mb-3" style={{ color: C.sage }} />
          אין עדיין תוכנית הסעה. לחצו על {'"'}תוכנית הסעה חדשה{'"'} כדי להתחיל.
        </div>
      ) : (
        <BusPlanDetail key={activePlan.id} plan={activePlan} onUpdatePlan={updatePlan} />
      )}
    </div>
  );
}
