import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function mifalYear(m: { event_date: string | null; start_date: string | null; work_start_date: string | null; created_at: string }) {
  const raw = m.event_date ?? m.start_date ?? m.work_start_date ?? m.created_at;
  return new Date(raw).getFullYear();
}

function formatIls(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value);
}

export async function AnnualSummaryTab() {
  const supabase = createClient();

  const [{ data: mifalim }, { data: expenses }, { data: income }] = await Promise.all([
    supabase
      .from("mifalim")
      .select("id, name, status, event_date, start_date, work_start_date, created_at, balance_transferred_at"),
    supabase.from("expenses").select("owner_id, quantity, unit_price").eq("owner_type", "mifal"),
    supabase.from("external_income").select("owner_id, amount").eq("owner_type", "mifal"),
  ]);

  const expenseByMifal = new Map<string, number>();
  for (const e of expenses ?? []) {
    if (!e.owner_id) continue;
    const cost = (e.quantity ?? 0) * (e.unit_price ?? 0);
    expenseByMifal.set(e.owner_id, (expenseByMifal.get(e.owner_id) ?? 0) + cost);
  }

  const incomeByMifal = new Map<string, number>();
  for (const i of income ?? []) {
    if (!i.owner_id) continue;
    incomeByMifal.set(i.owner_id, (incomeByMifal.get(i.owner_id) ?? 0) + (i.amount ?? 0));
  }

  const rows = (mifalim ?? []).map((m) => {
    const balance = (incomeByMifal.get(m.id) ?? 0) - (expenseByMifal.get(m.id) ?? 0);
    return { ...m, year: mifalYear(m), balance };
  });

  const byYear = new Map<number, typeof rows>();
  for (const row of rows) {
    if (!byYear.has(row.year)) byYear.set(row.year, []);
    byYear.get(row.year)!.push(row);
  }

  const years = [...byYear.keys()].sort((a, b) => b - a);

  if (years.length === 0) {
    return <p className="muted">אין מפעלים רשומים עדיין.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {years.map((year) => {
        const yearRows = byYear.get(year)!.sort((a, b) => b.balance - a.balance);
        const yearTotal = yearRows.reduce((sum, r) => sum + r.balance, 0);
        const negativeCount = yearRows.filter((r) => r.balance < 0).length;

        return (
          <section key={year} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.9rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.1rem" }}>{year}</h2>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "baseline" }}>
                {negativeCount > 0 && (
                  <span className="pill pill-danger">{negativeCount} מפעלים במינוס</span>
                )}
                <span className={`stat-value ${yearTotal < 0 ? "" : ""}`} style={{ fontWeight: 700, color: yearTotal < 0 ? "var(--danger)" : "var(--good)" }}>
                  סה״כ {formatIls(yearTotal)}
                </span>
              </div>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr style={{ textAlign: "right", color: "var(--ink-muted)", fontSize: "0.82rem" }}>
                    <th style={{ padding: "0.4rem 0.5rem" }}>מפעל</th>
                    <th style={{ padding: "0.4rem 0.5rem" }}>סטטוס</th>
                    <th style={{ padding: "0.4rem 0.5rem" }}>יתרה בפועל</th>
                    <th style={{ padding: "0.4rem 0.5rem" }}>ניהול יתרות</th>
                  </tr>
                </thead>
                <tbody>
                  {yearRows.map((row) => (
                    <tr key={row.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.55rem 0.5rem" }}>
                        <Link href={`/mifalim/${row.id}/budget`}>{row.name}</Link>
                      </td>
                      <td style={{ padding: "0.55rem 0.5rem" }}>
                        <span className="pill pill-neutral">{row.status}</span>
                      </td>
                      <td
                        className="stat-value"
                        style={{
                          padding: "0.55rem 0.5rem",
                          fontWeight: 600,
                          color: row.balance < 0 ? "var(--danger)" : "var(--ink)",
                        }}
                      >
                        {formatIls(row.balance)}
                      </td>
                      <td style={{ padding: "0.55rem 0.5rem" }}>
                        {row.balance_transferred_at ? (
                          <span className="pill pill-good">הועבר</span>
                        ) : (
                          <span className="muted" style={{ fontSize: "0.85rem" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
