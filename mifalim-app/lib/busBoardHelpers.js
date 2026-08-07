import * as XLSX from 'xlsx';

export function uid(p = 'id') { return `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }

export const BUS_TEMPLATE_HEADERS = ['שם הקבוצה', 'כמות', "נק' איסוף"];

export function downloadGroupsTemplate() {
  const wsData = [BUS_TEMPLATE_HEADERS, ['לדוגמה: כיתה ז׳ 1', 40, 'לדוגמה: כיכר העירייה, רעננה']];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 26 }, { wch: 10 }, { wch: 30 }];
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(wb, ws, 'קבוצות');
  XLSX.writeFile(wb, 'תבנית_קבוצות_הסעה.xlsx');
}

// Parses an uploaded Excel file, first validating it strictly matches the official template's header row.
export function parseGroupsExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (!rows.length) { reject(new Error('הקובץ ריק.')); return; }
        const headerRow = (rows[0] || []).map(h => String(h).trim());
        const missing = BUS_TEMPLATE_HEADERS.filter(h => !headerRow.includes(h));
        if (missing.length > 0) {
          reject(new Error(`הקובץ אינו תואם לתבנית הרשמית (חסרות עמודות: ${missing.join(', ')}). יש להוריד את התבנית ולמלא אותה בדיוק, ללא שינוי שמות העמודות.`));
          return;
        }
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        const groups = json.map(row => ({
          group_name: String(row['שם הקבוצה'] ?? '').trim(),
          quantity: Number(row['כמות']) || 0,
          pickup_point: String(row["נק' איסוף"] ?? '').trim(),
        })).filter(g => g.group_name || g.pickup_point);
        resolve(groups);
      } catch (err) { reject(err instanceof Error ? err : new Error('שגיאה בקריאת הקובץ.')); }
    };
    reader.onerror = () => reject(new Error('שגיאה בקריאת הקובץ.'));
    reader.readAsArrayBuffer(file);
  });
}

// If every fragment of a previously-split group (tracked via shared sourceGroupId) has ended up back in the
// same container (same bus, or all unassigned), recombine them into one piece with the summed quantity.
// Re-running this after every drag keeps split groups mergeable, while still letting them be split again.
export function mergeSplitGroupsIfComplete(pieces) {
  const bySource = {};
  pieces.forEach(p => { if (p.sourceGroupId) (bySource[p.sourceGroupId] = bySource[p.sourceGroupId] || []).push(p); });
  let result = pieces;
  Object.entries(bySource).forEach(([sourceId, group]) => {
    if (group.length <= 1) return;
    const allSameContainer = group.every(p => p.bus_id === group[0].bus_id);
    if (!allSameContainer) return;
    const merged = {
      id: uid('piece'), sourceGroupId: sourceId, group_name: group[0].group_name,
      quantity: group.reduce((s, p) => s + (Number(p.quantity) || 0), 0),
      pickup_point: group[0].pickup_point, bus_id: group[0].bus_id,
      is_split: false, split_label: null,
    };
    result = result.filter(p => p.sourceGroupId !== sourceId).concat(merged);
  });
  return result;
}

// Renders the bus board straight from data onto a native <canvas> and downloads it as a JPEG.
export function exportBoardAsImage(board, planName) {
  const width = 900, padding = 24;
  const busHeights = board.buses.map(bus => {
    let h = 60;
    if (bus.coordinator) h += 16;
    if (bus.driver) h += 16;
    const stops = bus.stopOrder.filter(sp => board.pieces.some(p => p.bus_id === bus.id && p.pickup_point === sp));
    stops.forEach(sp => { h += 20 + board.pieces.filter(p => p.bus_id === bus.id && p.pickup_point === sp).length * 16; });
    return h + 16;
  });
  const totalHeight = padding * 2 + 44 + busHeights.reduce((s, h) => s + h + 12, 0);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = Math.max(300, totalHeight);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#EEEEE4'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.direction = 'rtl'; ctx.textAlign = 'right';
  let y = padding;
  ctx.fillStyle = '#1E331B'; ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillText(planName || 'סידור אוטובוסים', width - padding, y + 20);
  y += 44;
  board.buses.forEach((bus, bi) => {
    const stops = bus.stopOrder.filter(sp => board.pieces.some(p => p.bus_id === bus.id && p.pickup_point === sp));
    const total = board.pieces.filter(p => p.bus_id === bus.id).reduce((s, p) => s + (Number(p.quantity) || 0), 0);
    const boxH = busHeights[bi];
    ctx.strokeStyle = total > bus.capacity ? '#9A3E2E' : '#DAD8C7';
    ctx.lineWidth = 2;
    ctx.strokeRect(padding, y, width - padding * 2, boxH);
    let ly = y + 24;
    ctx.font = 'bold 15px Arial, sans-serif'; ctx.fillStyle = '#1E331B';
    ctx.fillText(`אוטובוס ${bus.bus_number}  (${total}/${bus.capacity || '—'})`, width - padding - 12, ly);
    ly += 20;
    ctx.font = '12px Arial, sans-serif'; ctx.fillStyle = '#5B6151';
    if (bus.coordinator) { ctx.fillText(`אחראי: ${bus.coordinator}`, width - padding - 12, ly); ly += 16; }
    if (bus.driver) { ctx.fillText(`נהג: ${bus.driver}`, width - padding - 12, ly); ly += 16; }
    stops.forEach(sp => {
      const time = (bus.stopTimes && bus.stopTimes[sp]) || '';
      ctx.font = 'bold 12.5px Arial, sans-serif'; ctx.fillStyle = '#20261C';
      ctx.fillText(`${sp}${time ? ` — ${time}` : ''}`, width - padding - 12, ly);
      ly += 18;
      ctx.font = '12px Arial, sans-serif'; ctx.fillStyle = '#5B6151';
      board.pieces.filter(p => p.bus_id === bus.id && p.pickup_point === sp).forEach(p => {
        ctx.fillText(`• ${p.group_name}${p.is_split ? ` (${p.split_label || 'פיצול'})` : ''} — ${p.quantity}`, width - padding - 24, ly);
        ly += 16;
      });
    });
    y += boxH + 12;
  });
  const url = canvas.toDataURL('image/jpeg', 0.92);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(planName || 'סידור אוטובוסים').replace(/[\\/:*?"<>|]/g, '_')}.jpg`;
  a.click();
}
