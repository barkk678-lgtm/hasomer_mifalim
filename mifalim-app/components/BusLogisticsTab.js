'use client';
import { useState } from 'react';
import { Plus, Trash2, Bus, Upload, FileSpreadsheet, Wand2 } from 'lucide-react';
import { useBusPlans } from '../lib/useBusPlans';
import { useBusPlanDetail } from '../lib/useBusPlanDetail';
import { C } from '../lib/designSystem';
import { Card, IconButton, TextInput, Field, InlineGrid, PlacesAutocompleteInput } from './ui';
import { uid, downloadGroupsTemplate, parseGroupsExcel } from '../lib/busBoardHelpers';
import BusBoard from './BusBoard';

const GROUP_COLUMNS = [
  { key: 'pickup_point', label: "נק' איסוף", type: 'places-autocomplete', extraKey: 'place_id' },
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
  const { busTypes, groups, board, loading, createBusType, updateBusType, deleteBusType, createGroup, updateGroup, deleteGroup, addGroupsBulk, updateBoard } = useBusPlanDetail(plan.id);
  const [destination, setDestination] = useState(plan.destination || '');
  const [destinationPlaceId, setDestinationPlaceId] = useState(plan.destination_place_id || null);
  const [arrivalTime, setArrivalTime] = useState(plan.arrival_time || '');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [computing, setComputing] = useState(false);
  const [computeError, setComputeError] = useState('');
  const [computeWarnings, setComputeWarnings] = useState([]);

  const totalPeople = groups.reduce((s, g) => s + (Number(g.quantity) || 0), 0);
  const totalCapacity = busTypes.reduce((s, t) => s + (Number(t.capacity) || 0), 0);
  const hasBoard = board && board.board && (board.board.buses?.length > 0 || board.board.pieces?.length > 0);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true); setUploadError('');
    try {
      const newGroups = await parseGroupsExcel(file);
      if (newGroups.length === 0) setUploadError('לא נמצאו שורות תקינות בקובץ.');
      else await addGroupsBulk(newGroups);
    } catch (err) {
      setUploadError(err.message || 'שגיאה בקריאת הקובץ.');
    } finally {
      setUploading(false);
    }
  }

  // Seeds the interactive board with every current group as an unassigned "piece", ready for manual
  // drag-and-drop into buses. "חשב סידור אוטובוסים" is the same seed today — the automatic allocation
  // itself is computed by an external tool (not built here per instruction), so for now it hands you
  // the same manually-workable board rather than pretending to compute something it doesn't.
  function seedBoard() {
    const pieces = groups.map(g => ({ id: uid('piece'), sourceGroupId: g.id, group_name: g.group_name, quantity: g.quantity, pickup_point: g.pickup_point, bus_id: null, is_split: false, split_label: null }));
    updateBoard({ buses: [], pieces, notes: '' });
  }

  // Calls the real bin-packing + Google Maps engine (/api/compute-bus-assignment) — real travel
  // data, not an AI guess, and a hard guarantee that no bus ever exceeds its capacity.
  async function handleCompute() {
    if (!destination.trim()) { setComputeError('יש למלא יעד סופי לפני החישוב.'); return; }
    if (!arrivalTime) { setComputeError('יש למלא שעת הגעה ליעד לפני החישוב.'); return; }
    if (hasBoard && !confirm('כבר קיים לוח שיבוץ (כולל שינויים ידניים אם היו). חישוב מחדש יחליף אותו לגמרי. להמשיך?')) return;
    setComputing(true); setComputeError(''); setComputeWarnings([]);
    try {
      const res = await fetch('/api/compute-bus-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups, busTypes, destination, destinationPlaceId, arrivalTime }),
      });
      const data = await res.json();
      if (!res.ok) { setComputeError(data.error || 'שגיאה בחישוב הסידור.'); return; }
      await updateBoard(data.board);
      setComputeWarnings(data.warnings || []);
    } catch {
      setComputeError('שגיאה בתקשורת מול שרת החישוב. נסו שוב.');
    } finally {
      setComputing(false);
    }
  }

  if (loading) return <p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p>;

  return (
    <div>
      <Card title="קבוצות">
        <div className="flex flex-wrap gap-2 mb-3">
          <button type="button" onClick={downloadGroupsTemplate} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold" style={{ background: C.ochreSoft, color: '#6B4C16' }}><FileSpreadsheet size={15} /> הורדת תבנית לטעינה</button>
          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white cursor-pointer transition-opacity hover:opacity-90" style={{ background: C.forest, opacity: uploading ? 0.6 : 1 }}>
            <Upload size={15} /> {uploading ? 'טוען...' : 'העלאת קובץ לפי התבנית'}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} disabled={uploading} />
          </label>
        </div>
        {uploadError && <p className="text-xs mb-2" style={{ color: C.rust }}>{uploadError}</p>}
        <p className="text-xs mb-3" style={{ color: C.inkSoft }}>ואפשר גם להוסיף/לערוך ידנית ישירות בטבלה — כל שורה היא קבוצה שצריך לשבץ לאוטובוס.</p>
        <InlineGrid
          columns={GROUP_COLUMNS}
          rows={groups}
          makeEmptyDraft={emptyGroupDraft}
          onCreate={createGroup}
          onUpdate={updateGroup}
          onDelete={deleteGroup}
          getCellExtra={(row, col) => (col.key === 'pickup_point' ? { onSelectPlace: patch => updateGroup(row.id, patch) } : {})}
        />
        {groups.length > 0 && <p className="text-[11px] mt-2" style={{ color: C.inkSoft }}>{'סה"כ'} {groups.length} קבוצות, {totalPeople} איש.</p>}
      </Card>

      <Card title="סוגי אוטובוסים זמינים">
        <p className="text-xs mb-3" style={{ color: C.inkSoft }}>ניתן להגדיר כמה סוגים בקיבולות שונות.</p>
        <InlineGrid columns={BUS_TYPE_COLUMNS} rows={busTypes} makeEmptyDraft={emptyBusTypeDraft} onCreate={createBusType} onUpdate={updateBusType} onDelete={deleteBusType} />
        {busTypes.length > 0 && <p className="text-[11px] mt-2" style={{ color: C.inkSoft }}>{'סה"כ'} קיבולת: {totalCapacity} מקומות.</p>}
      </Card>

      <Card title="יעד סופי וחישוב">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="יעד סופי">
            <PlacesAutocompleteInput
              value={destination}
              placeholder="לדוגמה: כפר הנוער הדסים"
              onSelect={({ description, placeId }) => { setDestination(description); setDestinationPlaceId(placeId); onUpdatePlan(plan.id, { destination: description, destination_place_id: placeId }); }}
              onFreeTextCommit={text => { setDestination(text); setDestinationPlaceId(null); onUpdatePlan(plan.id, { destination: text, destination_place_id: null }); }}
            />
          </Field>
          <Field label="שעת הגעה ליעד">
            <TextInput type="time" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} onBlur={() => onUpdatePlan(plan.id, { arrival_time: arrivalTime })} />
          </Field>
        </div>
        <p className="text-[11px] mt-2" style={{ color: C.inkSoft }}>יש לבחור יעד ונקודות איסוף מתוך רשימת ההצעות שנפתחת בהקלדה (כמו בחיפוש ב-Google Maps) לחישוב מדויק — הקלדת טקסט חופשי בלי לבחור הצעה עלולה לגרום לטעויות מיקום.</p>
        {computeError && <p className="text-xs mt-2" style={{ color: C.rust }}>{computeError}</p>}
        {computeWarnings.length > 0 && (
          <div className="rounded-lg px-3 py-2 mt-2 text-xs" style={{ background: C.ochreSoft, color: '#6B4C16' }}>
            {computeWarnings.map((w, i) => <p key={i}>{w}</p>)}
          </div>
        )}
        <div className="flex justify-end items-center gap-2 mt-4">
          {!hasBoard && (
            <button disabled={groups.length === 0} onClick={seedBoard} className="px-4 py-2.5 rounded-lg text-sm font-semibold" style={{ background: C.ochreSoft, color: '#6B4C16', opacity: groups.length === 0 ? 0.5 : 1 }}>
              התחלת שיבוץ ידני
            </button>
          )}
          <button disabled={groups.length === 0 || computing} onClick={handleCompute} className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: C.linkBlue, opacity: (groups.length === 0 || computing) ? 0.5 : 1 }}>
            <Wand2 size={15} /> {computing ? 'מחשב...' : 'חשב סידור אוטובוסים'}
          </button>
        </div>
      </Card>

      {hasBoard && <BusBoard board={board.board} onChangeBoard={updateBoard} planName={plan.name} busTypes={busTypes} />}
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
