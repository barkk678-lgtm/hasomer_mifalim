import Link from "next/link";
import { AnnualSummaryTab } from "./annual-summary";
import { PettyCashTab } from "./petty-cash";

export default function BalancesPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const tab = searchParams.tab === "petty-cash" ? "petty-cash" : "annual";

  return (
    <div className="container">
      <h1 style={{ marginBottom: "0.25rem" }}>סיכום יתרות שנתי</h1>
      <p className="muted" style={{ marginTop: 0, marginBottom: "1.5rem" }}>
        יתרות בפועל בלבד — הכנסות שנגבו פחות הוצאות שהוצאו בפועל.
      </p>

      <nav className="tabs">
        <Link href="/balances?tab=annual" className={`tab-link ${tab === "annual" ? "active" : ""}`}>
          סיכום שנתי
        </Link>
        <Link href="/balances?tab=petty-cash" className={`tab-link ${tab === "petty-cash" ? "active" : ""}`}>
          ניהול יתרות
        </Link>
      </nav>

      {tab === "annual" ? <AnnualSummaryTab /> : <PettyCashTab />}
    </div>
  );
}
