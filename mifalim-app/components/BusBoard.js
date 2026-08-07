'use client';
import { useState, useEffect, useRef } from 'react';
import { Plus, FileSpreadsheet, Scissors, Undo2, GripVertical, Users, Info, Bus as BusIcon } from 'lucide-react';
import { C, NUMFONT } from '../lib/designSystem';
import { Badge } from './ui';
import { uid, mergeSplitGroupsIfComplete, exportBoardAsImage } from '../lib/busBoardHelpers';

function SplitPopover({ piece, onSplit, onClose }) {
  const total = Number(piece.quantity) || 0;
  const [qty, setQty] = useState(Math.max(1, Math.floor(total / 2)));
  return (
    <div className="absolute z-30 mt-1 rounded-lg shadow-lg p-2" style={{ background: C.surface, border: `1px solid ${C.line}`, minWidth: 170, right: 0 }} onClick={e => e.stopPropagation()}>
      <label className="text-[10px]" style={{ color: C.inkSoft }}>כמות לחלק הראשון (מתוך {total})</label>
      <input type="number" min={1} max={total - 1} value={qty} onChange={e => setQty(e.target.value)} className="w-full text-xs rounded px-2 py-1 mt-1" style={{ border: `1px solid ${C.line}`, color: C.ink }} />
      <div className="flex gap-1.5 mt-2">
        <button type="button" onClick={onClose} className="flex-1 text-xs py-1 rounded" style={{ color: C.inkSoft }}>ביטול</button>
        <button type="button" onClick={() => onSplit(qty)} className="flex-1 text-xs py-1 rounded text-white font-semibold" style={{ background: C.forest }}>פיצול</button>
      </div>
    </div>
  );
}

function PieceChip({ piece, onDragStart, onReturn, onSplit }) {
  const [splitOpen, setSplitOpen] = useState(false);
  const canSplit = (Number(piece.quantity) || 0) >= 2 && !!onSplit;
  return (
    <div className="relative">
      <div draggable onDragStart={e => onDragStart(e, piece.id)} className="flex items-center justify-between gap-1.5 text-[11px] px-2 py-1.5 rounded cursor-grab" style={{ background: C.paper, border: `1px solid ${C.line}` }}>
        <span className="truncate">{piece.group_name} {piece.is_split && <span style={{ color: C.ochre, fontWeight: 600 }}>({piece.split_label || 'פיצול'})</span>}</span>
        <span className="flex items-center gap-1 shrink-0">
          <strong style={{ ...NUMFONT, color: C.forestDark }}>{piece.quantity}</strong>
          {canSplit && <button type="button" onClick={() => setSplitOpen(o => !o)} title="פיצול קבוצה" style={{ color: C.inkSoft }}><Scissors size={12} /></button>}
          {onReturn && <button type="button" onClick={() => onReturn(piece.id)} title="החזרה למאגר הבלתי משובץ" style={{ color: C.inkSoft }}><Undo2 size={12} /></button>}
        </span>
      </div>
      {splitOpen && <SplitPopover piece={piece} onClose={() => setSplitOpen(false)} onSplit={qty => { onSplit(piece.id, qty); setSplitOpen(false); }} />}
    </div>
  );
}

function UnassignedPool({ pieces, onDragStartPiece, onDropToPool, onSplitPiece, dragActive, onDragOver, onDragLeave }) {
  return (
    <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDropToPool} className="rounded-xl p-3 mb-4" style={{ background: dragActive ? '#F5EEDC' : C.surface, border: `1.5px dashed ${C.line}` }}>
      <div className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: C.forestDark }}><Users size={13} /> טרם שובצו ({pieces.length})</div>
      {pieces.length === 0 ? (
        <p className="text-[11px]" style={{ color: C.inkSoft }}>כל הקבוצות משובצות. גררו קבוצה או נקודת איסוף שלמה לכאן כדי להסיר אותה מהאוטובוס.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
          {pieces.map(p => <PieceChip key={p.id} piece={p} onDragStart={onDragStartPiece} onSplit={onSplitPiece} />)}
        </div>
      )}
    </div>
  );
}

// The capacity badge doubles as a bus-type switcher: with exactly two bus types defined, a click
// just flips to the other one directly (no menu needed for a binary choice); with three or more,
// it opens a small picker listing them all. Updates both bus_type (label) and capacity together
// so the two never end up mismatched.
function CapacityPicker({ bus, busTypes, overCapacity, total, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const types = busTypes || [];
  if (types.length < 2) {
    return <Badge tone={overCapacity ? 'rust' : 'good'}>{total}{bus.capacity ? `/${bus.capacity}` : ''}</Badge>;
  }

  function handleClick() {
    if (types.length === 2) {
      const idx = types.findIndex(t => t.label === bus.bus_type && Number(t.capacity) === Number(bus.capacity));
      onSelect(types[idx === 0 ? 1 : 0]);
    } else {
      setOpen(o => !o);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={handleClick} title="שינוי סוג אוטובוס">
        <Badge tone={overCapacity ? 'rust' : 'good'}>{total}{bus.capacity ? `/${bus.capacity}` : ''}</Badge>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 left-0 rounded-lg shadow-lg p-1" style={{ background: C.surface, border: `1px solid ${C.line}`, minWidth: 150 }}>
          {types.map(t => (
            <button key={t.id} type="button" onClick={() => { onSelect(t); setOpen(false); }} className="w-full text-right text-xs px-2.5 py-1.5 rounded hover:bg-black/5" style={{ color: C.ink }}>
              {t.label} ({t.capacity})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Plain, locally-buffered text field: `value` only advances once the board round-trips through
// Supabase (onChangeBoard → upsert → setBoard), so a controlled input wired directly to it fights
// every keystroke — the field visibly reverts/eats characters while typing. Buffering locally and
// committing on blur makes it behave like an ordinary text input, no different from any other
// field in the app.
function BufferedTextInput({ value, onCommit, ...props }) {
  const [local, setLocal] = useState(value || '');
  useEffect(() => { setLocal(value || ''); }, [value]);
  return (
    <input
      {...props}
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
    />
  );
}

function BusCard({ bus, pieces, busTypes, onField, onSetBusType, onDropAny, onDragStartPiece, onSplitPiece, onReorderStop, onMoveStop, onUpdateStopTime, onReturnPiece, onReturnStop, dragOverBusId, onDragOver, onDragLeave }) {
  const total = pieces.reduce((s, p) => s + (Number(p.quantity) || 0), 0);
  const overCapacity = bus.capacity > 0 && total > bus.capacity;
  const stops = bus.stopOrder.filter(sp => pieces.some(p => p.pickup_point === sp));
  return (
    <div
      onDragOver={e => onDragOver(e, bus.id)} onDragLeave={onDragLeave} onDrop={e => onDropAny(e, bus.id)}
      className="rounded-xl p-3 flex flex-col gap-2 transition-colors"
      style={{ background: dragOverBusId === bus.id ? '#F5EEDC' : C.surface, border: `2px solid ${overCapacity ? C.rust : C.line}` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold flex items-center gap-1" style={{ color: C.forestDark }}><BusIcon size={13} /> אוטובוס {bus.bus_number}</span>
        <CapacityPicker bus={bus} busTypes={busTypes} overCapacity={overCapacity} total={total} onSelect={onSetBusType} />
      </div>
      {/* Fixed-width labels (w-9) so "אחראי"/"נהג" — different text lengths — don't push their
          inputs to start at different x positions. */}
      <div className="flex items-center gap-1.5"><span className="text-[10px] shrink-0 w-9" style={{ color: C.inkSoft }}>אחראי</span><BufferedTextInput value={bus.coordinator} onCommit={v => onField('coordinator', v)} placeholder="שם + טלפון" className="flex-1 min-w-0 text-[11px] px-2 py-1.5 rounded" style={{ border: `1px solid ${C.line}` }} /></div>
      <div className="flex items-center gap-1.5"><span className="text-[10px] shrink-0 w-9" style={{ color: C.inkSoft }}>נהג</span><BufferedTextInput value={bus.driver} onCommit={v => onField('driver', v)} placeholder="שם + טלפון" className="flex-1 min-w-0 text-[11px] px-2 py-1.5 rounded" style={{ border: `1px solid ${C.line}` }} /></div>
      <div className="flex flex-col gap-1.5 mt-1">
        {stops.length === 0 ? (
          <p className="text-[11px] text-center py-3" style={{ color: C.inkSoft }}>גררו קבוצות או נקודות איסוף לכאן</p>
        ) : stops.map(sp => (
          <div key={sp}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault(); e.stopPropagation();
              let payload = null; try { payload = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (err) { /* ignore malformed payload */ }
              if (payload?.kind === 'stop') { payload.busId === bus.id ? onReorderStop(bus.id, payload.pickupPoint, sp) : onMoveStop(payload.busId, payload.pickupPoint, bus.id); }
              else if (payload?.kind === 'piece') onDropAny(e, bus.id);
            }}
            className="rounded-lg p-2" style={{ background: C.paper, border: `1px solid ${C.line}` }}>
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1 min-w-0">
                {/* Dedicated drag handle — carries the entire pickup point (with all its groups) to another
                    bus or back to the pool, and separately supports reordering within the same bus. Kept apart
                    from the piece chips below so the two draggable regions never nest (which breaks native DnD). */}
                <span draggable onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'stop', busId: bus.id, pickupPoint: sp })); }} className="cursor-grab shrink-0" title="גררו להעברת כל נקודת האיסוף, או לשינוי הסדר" style={{ color: C.inkSoft }}>
                  <GripVertical size={13} />
                </span>
                <span className="text-[11px] font-semibold truncate" style={{ color: C.ink }}>{sp}</span>
                <button type="button" onClick={() => onReturnStop(bus.id, sp)} title="החזרת כל התחנה למאגר הבלתי משובץ" className="shrink-0" style={{ color: C.inkSoft }}><Undo2 size={12} /></button>
              </div>
              <BufferedTextInput
                type="text" value={(bus.stopTimes && bus.stopTimes[sp]) || ''} onCommit={v => onUpdateStopTime(bus.id, sp, v)}
                placeholder="שעה" className="text-[11px] rounded px-1.5 py-1 shrink-0 text-center" style={{ border: `1px solid ${C.line}`, color: C.ink, width: 64 }}
              />
            </div>
            <div className="flex flex-col gap-1">
              {pieces.filter(p => p.pickup_point === sp).map(p => <PieceChip key={p.id} piece={p} onDragStart={onDragStartPiece} onReturn={onReturnPiece} onSplit={onSplitPiece} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// `board` is the plain {buses, pieces, notes} object (from bus_boards.board); onChangeBoard
// persists the whole thing back via useBusPlanDetail's updateBoard.
export default function BusBoard({ board, onChangeBoard, planName, busTypes }) {
  const [dragOverBusId, setDragOverBusId] = useState(null);
  const [poolDragActive, setPoolDragActive] = useState(false);

  function onDragStartPiece(e, pieceId) { e.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'piece', pieceId })); }
  function readPayload(e) { try { return JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return null; } }

  function movePieceToBus(pieceId, busId) {
    const piece = board.pieces.find(p => p.id === pieceId);
    if (!piece) return;
    let buses = board.buses;
    if (busId) buses = buses.map(b => (b.id === busId && !b.stopOrder.includes(piece.pickup_point)) ? { ...b, stopOrder: [...b.stopOrder, piece.pickup_point] } : b);
    const pieces = mergeSplitGroupsIfComplete(board.pieces.map(p => p.id === pieceId ? { ...p, bus_id: busId } : p));
    onChangeBoard({ ...board, buses, pieces });
  }
  // Moves an entire pickup point — and every group piece assigned to it — from one bus to another (or to the pool, busId=null).
  function moveStopToBus(sourceBusId, pickupPoint, targetBusId) {
    if (sourceBusId === targetBusId) return;
    const pieces = mergeSplitGroupsIfComplete(board.pieces.map(p => (p.bus_id === sourceBusId && p.pickup_point === pickupPoint) ? { ...p, bus_id: targetBusId } : p));
    const buses = board.buses.map(b => {
      if (b.id === sourceBusId) return { ...b, stopOrder: b.stopOrder.filter(sp => sp !== pickupPoint) };
      if (b.id === targetBusId && !b.stopOrder.includes(pickupPoint)) return { ...b, stopOrder: [...b.stopOrder, pickupPoint] };
      return b;
    });
    onChangeBoard({ ...board, buses, pieces });
  }
  function handleDropOnBus(e, busId) {
    e.preventDefault(); setDragOverBusId(null);
    const payload = readPayload(e);
    if (payload?.kind === 'piece') movePieceToBus(payload.pieceId, busId);
    else if (payload?.kind === 'stop' && payload.busId !== busId) moveStopToBus(payload.busId, payload.pickupPoint, busId);
  }
  function handleDropOnPool(e) {
    e.preventDefault(); setPoolDragActive(false);
    const payload = readPayload(e);
    if (payload?.kind === 'piece') movePieceToBus(payload.pieceId, null);
    else if (payload?.kind === 'stop') moveStopToBus(payload.busId, payload.pickupPoint, null);
  }
  function updateBusField(busId, key, value) {
    onChangeBoard({ ...board, buses: board.buses.map(b => b.id === busId ? { ...b, [key]: value } : b) });
  }
  function setBusType(busId, type) {
    onChangeBoard({ ...board, buses: board.buses.map(b => b.id === busId ? { ...b, bus_type: type.label, capacity: Number(type.capacity) || 0 } : b) });
  }
  function updateStopTime(busId, pickupPoint, time) {
    onChangeBoard({ ...board, buses: board.buses.map(b => b.id === busId ? { ...b, stopTimes: { ...(b.stopTimes || {}), [pickupPoint]: time } } : b) });
  }
  function reorderStopInBus(busId, draggedStop, targetStop) {
    if (draggedStop === targetStop) return;
    const buses = board.buses.map(b => {
      if (b.id !== busId) return b;
      const withoutDragged = b.stopOrder.filter(sp => sp !== draggedStop);
      const targetIdx = withoutDragged.indexOf(targetStop);
      const newOrder = targetIdx === -1 ? [...withoutDragged, draggedStop] : [...withoutDragged.slice(0, targetIdx), draggedStop, ...withoutDragged.slice(targetIdx)];
      return { ...b, stopOrder: newOrder };
    });
    onChangeBoard({ ...board, buses });
  }
  // Manual split: divides one piece into two fragments sharing the same sourceGroupId (so they can later
  // auto-merge if they end up back in the same bus/pool, and can themselves be split again).
  function splitPiece(pieceId, qtyFirst) {
    const piece = board.pieces.find(p => p.id === pieceId);
    if (!piece) return;
    const total = Number(piece.quantity) || 0;
    if (total < 2) return;
    const q1 = Math.max(1, Math.min(total - 1, Math.round(Number(qtyFirst) || 0)));
    const q2 = total - q1;
    if (q2 <= 0) return;
    const sourceId = piece.sourceGroupId || piece.id;
    const partA = { ...piece, id: uid('piece'), sourceGroupId: sourceId, quantity: q1, is_split: true, split_label: 'חלק א׳' };
    const partB = { ...piece, id: uid('piece'), sourceGroupId: sourceId, quantity: q2, is_split: true, split_label: 'חלק ב׳' };
    onChangeBoard({ ...board, pieces: board.pieces.filter(p => p.id !== pieceId).concat([partA, partB]) });
  }
  function addManualBus() {
    const template = board.buses[0];
    const newBus = { id: uid('bus'), bus_number: board.buses.length + 1, bus_type: template?.bus_type || '', capacity: template?.capacity || 50, coordinator: '', driver: '', stopOrder: [], stopTimes: {} };
    onChangeBoard({ ...board, buses: [...board.buses, newBus] });
  }

  const unassigned = board.pieces.filter(p => !p.bus_id);

  return (
    <div>
      <h3 className="text-sm font-bold mb-3" style={{ color: C.forestDark }}>לוח שיבוץ אינטראקטיבי — גררו קבוצות או תחנות שלמות בין אוטובוסים</h3>
      <UnassignedPool pieces={unassigned} onDragStartPiece={onDragStartPiece} onDropToPool={handleDropOnPool} onSplitPiece={splitPiece} dragActive={poolDragActive} onDragOver={e => { e.preventDefault(); setPoolDragActive(true); }} onDragLeave={() => setPoolDragActive(false)} />
      <div className="flex items-center gap-2 mb-4">
        <button onClick={addManualBus} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: C.linkBlue, color: '#fff' }}><Plus size={13} /> צור אוטובוס חדש</button>
        <button onClick={() => exportBoardAsImage(board, planName)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: C.greenGoodSoft, color: C.greenGood }}><FileSpreadsheet size={13} /> ייצוא ל-JPEG</button>
      </div>
      {board.notes && (
        <div className="mb-4 rounded-lg p-3 flex items-start gap-2" style={{ background: '#EDEEE0', border: `1px solid ${C.line}` }}>
          <span className="shrink-0 flex items-center justify-center rounded-full" style={{ width: 22, height: 22, background: C.steel }}><Info size={12} color="#fff" /></span>
          <div>
            <div className="text-[11px] font-bold mb-0.5" style={{ color: C.forestDark }}>הערת מערכת</div>
            <p className="text-xs" style={{ color: C.inkSoft }}>{board.notes}</p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {board.buses.map(bus => (
          <BusCard
            key={bus.id} bus={bus} pieces={board.pieces.filter(p => p.bus_id === bus.id)} busTypes={busTypes}
            onField={(k, v) => updateBusField(bus.id, k, v)}
            onSetBusType={type => setBusType(bus.id, type)}
            onDropAny={handleDropOnBus} onDragStartPiece={onDragStartPiece} onSplitPiece={splitPiece}
            onReorderStop={reorderStopInBus} onMoveStop={moveStopToBus}
            onUpdateStopTime={updateStopTime}
            onReturnPiece={pieceId => movePieceToBus(pieceId, null)}
            onReturnStop={(busId, sp) => moveStopToBus(busId, sp, null)}
            dragOverBusId={dragOverBusId}
            onDragOver={(e, busId) => { e.preventDefault(); setDragOverBusId(busId); }}
            onDragLeave={() => setDragOverBusId(null)}
          />
        ))}
      </div>
    </div>
  );
}
