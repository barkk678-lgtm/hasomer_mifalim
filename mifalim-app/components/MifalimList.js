'use client';
import { useState } from 'react';
import { useMifalim } from '../lib/useMifalim';

const MIFAL_TYPES = {
  day_trip: 'טיול חד יומי',
  multi_day: 'טיול רב יומי / מחנה',
  seminar: 'סמינר',
  preparation: 'הכנת מדריכים',
};

const boxStyle = { border: '1px solid #DAD8C7', borderRadius: 10, padding: 20, marginTop: 24 };
const inputStyle = { padding: 8, fontSize: 14, border: '1px solid #ccc', borderRadius: 6 };
const buttonStyle = { padding: '8px 16px', fontSize: 14, borderRadius: 6, background: '#2E4A2A', color: '#fff', border: 'none', cursor: 'pointer' };

export default function MifalimList() {
  const { mifalim, loading, createMifal, deleteMifal } = useMifalim();
  const [name, setName] = useState('');
  const [type, setType] = useState('day_trip');
  const [saving, setSaving] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await createMifal({ name: name.trim(), type });
    setName('');
    setSaving(false);
  }

  return (
    <div style={boxStyle}>
      <h2 style={{ marginBottom: 12 }}>מפעלים (נתונים אמיתיים מ-Supabase)</h2>

      <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="שם המפעל"
          style={{ ...inputStyle, flex: 1, minWidth: 180 }}
        />
        <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
          {Object.entries(MIFAL_TYPES).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button type="submit" disabled={saving || !name.trim()} style={buttonStyle}>
          {saving ? 'שומר...' : 'הוספת מפעל'}
        </button>
      </form>

      {loading ? (
        <p>טוען...</p>
      ) : mifalim.length === 0 ? (
        <p style={{ color: '#666' }}>אין עדיין מפעלים — תוסיפו את הראשון למעלה.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'right', borderBottom: '2px solid #DAD8C7' }}>
              <th style={{ padding: 8 }}>שם</th>
              <th style={{ padding: 8 }}>סוג</th>
              <th style={{ padding: 8 }}></th>
            </tr>
          </thead>
          <tbody>
            {mifalim.map(m => (
              <tr key={m.id} style={{ borderBottom: '1px solid #EEEEE4' }}>
                <td style={{ padding: 8 }}>{m.name}</td>
                <td style={{ padding: 8 }}>{MIFAL_TYPES[m.type] || m.type}</td>
                <td style={{ padding: 8, textAlign: 'left' }}>
                  <button onClick={() => deleteMifal(m.id)} style={{ background: 'none', border: 'none', color: '#9A3E2E', cursor: 'pointer' }}>
                    מחיקה
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
