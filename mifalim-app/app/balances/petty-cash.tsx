import { createClient } from "@/lib/supabase/server";
import { PettyCashTrendChart } from "./petty-cash-chart";
import { addGeneralExpense, addGeneralIncome } from "./actions";

function formatIls(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("he-IL", { year: "numeric", month: "short", day: "numeric" }).format(
    new Date(value)
  );
}

export async function PettyCashTab() {
  const supabase = createClient();

  const [{ data: transfers }, { data: expenses }, { data: income }] = await Promise.all([
    supabase
      .from("mifal_balance_transfers")
      .select("id, amount, note, transferred_at, mifalim(name)")
      .order("transferred_at", { ascending: true }),
    supabase
      .from("expenses")
      .select("id, expense_name, quantity, unit_price, occurred_at, notes")
      .eq("owner_type", "general")
      .order("occurred_at", { ascending: false }),
    supabase
      .from("external_income")
      .select("id, source_name, amount, occurred_at")
      .eq("owner_type", "general")
      .order("occurred_at", { ascending: false }),
  ]);

  const transferTotal = (transfers ?? []).reduce((sum, t) => sum + t.amount, 0);
  const incomeTotal = (income ?? []).reduce((sum, i) => sum + (i.amount ?? 0), 0);
  const expenseTotal = (expenses ?? []).reduce((sum, e) => sum + (e.quantity ?? 0) * (e.unit_price ?? 0), 0);
  const total = transferTotal + incomeTotal - expenseTotal;

  let running = 0;
  const trendPoints = (transfers ?? []).map((t) => {
    running += t.amount;
    return {
      date: t.transferred_at,
      label: formatDate(t.transferred_at),
      balance: running,
    };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      <section className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>יתרת קופה נוכחית (בפועל)</p>
            <p
              className="stat-value"
              style={{ margin: 0, fontSize: "2rem", fontWeight: 700, color: total < 0 ? "var(--danger)" : "var(--ink)" }}
            >
              {formatIls(total)}
            </p>
          </div>
          <div className="muted" style={{ fontSize: "0.85rem", textAlign: "left" }}>
            <div>העברות ממפעלים: {formatIls(transferTotal)}</div>
            <div>הכנסות ישירות: {formatIls(incomeTotal)}</div>
            <div>הוצאות ישירות: {formatIls(expenseTotal)}</div>
          </div>
        </div>

        <PettyCashTrendChart points={trendPoints} />
        <p className="muted" style={{ fontSize: "0.78rem", margin: 0 }}>
          הגרף מציג רק את קפיצות ההעברה מסגירת מפעלים (יש להן תאריך ודאי). הוצאות והכנסות ישירות
          משפיעות על היתרה הכוללת למעלה אך לא מצוירות בציר הזמן.
        </p>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <section className="card">
          <h3 style={{ marginTop: 0, fontSize: "1rem" }}>הוסף הוצאה מהקופה</h3>
          <form action={addGeneralExpense} style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <span style={{ fontSize: "0.82rem" }}>תיאור</span>
              <input type="text" name="expense_name" required />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <span style={{ fontSize: "0.82rem" }}>סכום (₪)</span>
              <input type="number" name="amount" step="0.01" min="0" required />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <span style={{ fontSize: "0.82rem" }}>תאריך</span>
              <input type="date" name="occurred_at" required />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <span style={{ fontSize: "0.82rem" }}>הערות (לא חובה)</span>
              <input type="text" name="notes" />
            </label>
            <button type="submit" className="btn btn-primary">הוספת הוצאה</button>
          </form>
        </section>

        <section className="card">
          <h3 style={{ marginTop: 0, fontSize: "1rem" }}>הוסף הכנסה לקופה</h3>
          <form action={addGeneralIncome} style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <span style={{ fontSize: "0.82rem" }}>מקור</span>
              <input type="text" name="source_name" required />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <span style={{ fontSize: "0.82rem" }}>סכום (₪)</span>
              <input type="number" name="amount" step="0.01" min="0" required />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <span style={{ fontSize: "0.82rem" }}>תאריך</span>
              <input type="date" name="occurred_at" required />
            </label>
            <button type="submit" className="btn btn-primary">הוספת הכנסה</button>
          </form>
        </section>
      </div>

      <section className="card">
        <h3 style={{ marginTop: 0, fontSize: "1rem" }}>העברות מסגירת מפעלים</h3>
        {(transfers ?? []).length === 0 ? (
          <p className="muted" style={{ fontSize: "0.9rem" }}>אין עדיין העברות.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr style={{ textAlign: "right", color: "var(--ink-muted)", fontSize: "0.82rem" }}>
                  <th style={{ padding: "0.4rem 0.5rem" }}>מפעל</th>
                  <th style={{ padding: "0.4rem 0.5rem" }}>תאריך</th>
                  <th style={{ padding: "0.4rem 0.5rem" }}>סכום</th>
                  <th style={{ padding: "0.4rem 0.5rem" }}>הערה</th>
                </tr>
              </thead>
              <tbody>
                {[...(transfers ?? [])].reverse().map((t) => (
                  <tr key={t.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.5rem" }}>{(t as any).mifalim?.name ?? "—"}</td>
                    <td style={{ padding: "0.5rem" }}>{formatDate(t.transferred_at)}</td>
                    <td
                      className="stat-value"
                      style={{ padding: "0.5rem", fontWeight: 600, color: t.amount < 0 ? "var(--danger)" : "var(--ink)" }}
                    >
                      {formatIls(t.amount)}
                    </td>
                    <td style={{ padding: "0.5rem" }} className="muted">{t.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <section className="card">
          <h3 style={{ marginTop: 0, fontSize: "1rem" }}>הוצאות ישירות</h3>
          {(expenses ?? []).length === 0 ? (
            <p className="muted" style={{ fontSize: "0.9rem" }}>אין הוצאות ישירות עדיין.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {(expenses ?? []).map((e) => (
                <li key={e.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
                  <div>
                    <div>{e.expense_name}</div>
                    <div className="muted" style={{ fontSize: "0.78rem" }}>{e.occurred_at ? formatDate(e.occurred_at) : "—"}</div>
                  </div>
                  <span className="stat-value" style={{ fontWeight: 600 }}>
                    {formatIls((e.quantity ?? 0) * (e.unit_price ?? 0))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h3 style={{ marginTop: 0, fontSize: "1rem" }}>הכנסות ישירות</h3>
          {(income ?? []).length === 0 ? (
            <p className="muted" style={{ fontSize: "0.9rem" }}>אין הכנסות ישירות עדיין.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {(income ?? []).map((i) => (
                <li key={i.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
                  <div>
                    <div>{i.source_name}</div>
                    <div className="muted" style={{ fontSize: "0.78rem" }}>{i.occurred_at ? formatDate(i.occurred_at) : "—"}</div>
                  </div>
                  <span className="stat-value" style={{ fontWeight: 600 }}>{formatIls(i.amount ?? 0)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
