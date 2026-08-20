import './globals.css';

export const metadata = {
  title: 'נוער לב השרון — ניהול מפעלים',
  description: 'מערכת לניהול מפעלים, משימות ותקציב',
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
