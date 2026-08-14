import { signIn } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div
      className="container"
      style={{ maxWidth: 420, paddingTop: "4rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}
    >
      <div>
        <h1 style={{ margin: 0, fontSize: "1.4rem" }}>כניסה למערכת</h1>
        <p className="muted" style={{ marginTop: "0.4rem" }}>ניהול מפעלים ותקציבים</p>
      </div>

      <form action={signIn} className="card" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <span style={{ fontSize: "0.85rem" }}>אימייל</span>
          <input type="text" name="email" required autoComplete="email" />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <span style={{ fontSize: "0.85rem" }}>סיסמה</span>
          <input type="password" name="password" required autoComplete="current-password" />
        </label>
        {searchParams.error && (
          <p className="pill pill-danger" style={{ width: "fit-content" }}>
            {searchParams.error}
          </p>
        )}
        <button type="submit" className="btn btn-primary" style={{ justifyContent: "center" }}>
          התחברות
        </button>
      </form>
    </div>
  );
}
