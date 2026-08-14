"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = {
  date: string;
  label: string;
  balance: number;
};

function formatIls(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function PettyCashTrendChart({ points }: { points: Point[] }) {
  if (points.length === 0) {
    return (
      <p className="muted" style={{ fontSize: "0.9rem" }}>
        עדיין אין העברות מהמפעלים — הגרף יתחיל להצטייר ברגע שמפעל ראשון ייסגר ויעביר יתרה.
      </p>
    );
  }

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="pettyCashFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--ink-muted)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--ink-muted)" }}
            axisLine={false}
            tickLine={false}
            width={70}
            tickFormatter={(v) => formatIls(v)}
          />
          <Tooltip
            formatter={(value: number) => formatIls(value)}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: "0.85rem",
            }}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#pettyCashFill)"
            dot={{ r: 3, fill: "var(--accent)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
