'use client';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { C, DONUT_COLORS } from '../lib/designSystem';

function BiTooltip({ active, payload, unitLabel, valueFormatter }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  return (
    <div dir="rtl" style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 10, padding: '8px 12px', boxShadow: '0 6px 18px rgba(20,30,15,0.12)', fontFamily: 'Heebo, sans-serif', fontSize: 12, textAlign: 'right', minWidth: 120 }}>
      <div style={{ fontWeight: 700, color: C.forestDark, marginBottom: 3 }}>{p.name}</div>
      <div style={{ color: C.inkSoft }}>{unitLabel}: <strong style={{ color: C.forest }}>{valueFormatter(p.value)}</strong></div>
    </div>
  );
}

function DonutLegendRow({ color, label, count, active, onClick }) {
  return (
    <button onClick={onClick} className="flex items-center justify-between w-full text-right gap-3 py-1.5 px-1.5 rounded-md hover:bg-black/5 transition-opacity" style={{ opacity: active ? 1 : 0.4 }}>
      <span className="flex items-center gap-2 min-w-0">
        <span style={{ width: 12, height: 12, borderRadius: 4, background: color, flexShrink: 0 }} />
        <span className="text-sm font-medium truncate" style={{ color: C.ink }}>{label}</span>
      </span>
      <span className="text-sm font-bold shrink-0" style={{ color: C.forestDark }}>{count}</span>
    </button>
  );
}

const RADIAN = Math.PI / 180;
function renderPercentLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.02) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return <text x={x} y={y} fill="#fff" fontSize={13} fontWeight={700} fontFamily="Heebo, sans-serif" textAnchor="middle" dominantBaseline="central">{`${Math.round(percent * 100)}%`}</text>;
}

// Reusable donut chart with a legend list: donut on the right, legend on the left, click to
// filter (multi-select). `data` is [{ key, name, value }].
export default function CrossFilterDonutChart({ title, unitLabel, data, selected, onToggle, valueFormatter = v => v }) {
  const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name, 'he'));
  return (
    <div className="rounded-2xl p-5" style={{ background: '#fff', border: `1px solid ${C.line}`, boxShadow: '0 1px 3px rgba(20,30,15,0.06), 0 1px 2px rgba(20,30,15,0.04)' }}>
      <h4 className="text-sm font-bold mb-1" style={{ color: C.forestDark, fontFamily: 'Rubik, sans-serif' }}>{title}</h4>
      <p className="text-[11px] mb-3" style={{ color: C.inkSoft }}>לחצו על קטגוריה לסינון</p>
      {sorted.length === 0 ? (
        <div className="flex items-center justify-center text-sm rounded-xl" style={{ height: 200, color: C.inkSoft, background: C.paper }}>אין נתונים להצגה</div>
      ) : (
        <div className="flex items-center gap-4">
          <div style={{ width: 190, height: 190, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sorted} dataKey="value" nameKey="name" innerRadius={52} outerRadius={88} startAngle={90} endAngle={-270} paddingAngle={1} label={renderPercentLabel} labelLine={false} cursor="pointer" onClick={entry => onToggle(entry.key)}>
                  {sorted.map((entry, i) => {
                    const active = selected.length === 0 || selected.includes(entry.key);
                    return <Cell key={entry.key} fill={DONUT_COLORS[i % DONUT_COLORS.length]} opacity={active ? 1 : 0.35} />;
                  })}
                </Pie>
                <Tooltip content={<BiTooltip unitLabel={unitLabel} valueFormatter={valueFormatter} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 flex flex-col gap-0.5 min-w-0">
            {sorted.map((entry, i) => {
              const active = selected.length === 0 || selected.includes(entry.key);
              return <DonutLegendRow key={entry.key} color={DONUT_COLORS[i % DONUT_COLORS.length]} label={entry.name} count={valueFormatter(entry.value)} active={active} onClick={() => onToggle(entry.key)} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
