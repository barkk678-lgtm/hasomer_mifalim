import * as XLSX from 'xlsx';

// Shared by every "ייצוא לאקסל" button across the app. `columns` is
// [{ key, label, value? }] — value(row) overrides reading row[key] directly.
export function exportToExcel(rows, columns, filename) {
  const data = rows.map(r => {
    const obj = {};
    columns.forEach(c => { obj[c.label] = c.value ? c.value(r) : r[c.key]; });
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(wb, ws, 'נתונים');
  XLSX.writeFile(wb, filename);
}
