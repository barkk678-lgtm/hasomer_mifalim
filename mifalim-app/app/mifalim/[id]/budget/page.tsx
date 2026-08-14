import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { transferBalance } from "./actions";

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

export default async function MifalBudgetPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: mifal }, { data: expenses }, { data: income }] = await Promise.all([
    supabase.from("mifalim").select("*").eq("id", params.id).maybeSingle(),
    supabase
      .from("expenses")
      .select("id, expense_name, quantity, unit_price, expense_type, notes")
      .eq("owner_type", "mifal")
      .eq("owner_id", params.id),
    supabase.from("external_income").select("id, source_name, amount").eq("owner_type", "mifal").eq("owner_id", params.id),
  ]);

  if (!mifal) notFound();

  const expenseTotal = (expenses ?? []).reduce((sum, e) => sum + (e.quantity ?? 0) * (e.unit_price ?? 0), 0);
  const incomeTotal = (income ?? []).reduce((sum, i) => sum + (i.amount ?? 0), 0);
  const balance = incomeTotal - expenseTotal;

  const canTransfer = mifal.status === "הסתיים" && !mifal.balance_transferred_at;
  const boundTransfer = transferBalance.bind(null, mifal.id);

  return (
    <div className="container">
      <Link href="/balances" className="muted" style={{ fontSize: "0.85rem" }}>
        ← חזרה לסיכום יתרות
      </Link>
      <h1 style={{ marginTop: "0.5rem", marginBottom: "0.25rem" }}>{mifal.name}</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        <span className="pill pill-neutral">{mifal.status}</span>
      </p>

      <section className="card" style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>יתרה בפועל</p>
            <p
              className="stat-value"
              style={{ margin: 0, fontSize: "1.8rem", fontWeight: 700, color: balance < 0 ? "var(--danger)" : "var(--ink)" }}
            >
              {formatIls(balance)}
            </p>
            <p className="muted" style={{ fontSize: "0.8rem" }}>
              הכנסות {formatIls(incomeTotal)} · הוצאות {formatIls(expenseTotal)}
            </p>
          </div>

          <div style={{ textAlign: "left" }}>
            {mifal.balance_transferred_at ? (
              <span className="pill pill-good">
                הועבר לניהול יתרות ב-{formatDate(mifal.balance_transferred_at)}
              </span>
            ) : canTransfer ? (
              <form action={boundTransfer} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
                <input type="text" name="note" placeholder="הערה (לא חובה)" style={{ width: 220 }} />
                <button type="submit" className="btn btn-primary">
                  סגור מפעל והעבר יתרה לניהול יתרות
                </button>
              </form>
            ) : (
              <span className="muted" style={{ fontSize: "0.85rem" }}>
                ניתן להעביר יתרה רק אחרי שהמפעל מסומן כ״הסתיים״
              </span>
            )}
          </div>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <section className="card">
          <h3 style={{ marginTop: 0, fontSize: "1rem" }}>הוצאות</h3>
          {(expenses ?? []).length === 0 ? (
            <p className="muted" style={{ fontSize: "0.9rem" }}>אין הוצאות רשומות.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {(expenses ?? []).map((e) => (
                <li key={e.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
                  <div>
                    <div>{e.expense_name}</div>
                    {e.expense_type && <div className="muted" style={{ fontSize: "0.78rem" }}>{e.expense_type}</div>}
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
          <h3 style={{ marginTop: 0, fontSize: "1rem" }}>הכנסות</h3>
          {(income ?? []).length === 0 ? (
            <p className="muted" style={{ fontSize: "0.9rem" }}>אין הכנסות רשומות.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {(income ?? []).map((i) => (
                <li key={i.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
                  <span>{i.source_name}</span>
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
