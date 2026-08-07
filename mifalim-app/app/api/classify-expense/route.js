import { NextResponse } from 'next/server';
import { EXPENSE_TYPES } from '../../../lib/designSystem';

// Mirrors the classification rules from the original React demo's buildExpenseTypeSystemPrompt,
// ported here since this now runs server-side against a real OpenAI key instead of the
// artifacts-sandbox-only anthropic fetch the original relied on.
function buildSystemPrompt() {
  return `אתה מסווג הוצאות עבור תנועת נוער בישראל, לפי שם ספק ותיאור ההוצאה. עליך להחזיר אך ורק אובייקט JSON בפורמט {"type": "קטגוריה"} שבו הקטגוריה היא בדיוק אחת מהקטגוריות הבאות, ללא כל טקסט נוסף ובלי הסברים: ${JSON.stringify(EXPENSE_TYPES)}.

הנחיות סיווג מחייבות, קטגוריה אחר קטגוריה — התאימו תמיד לפי המשמעות הסמנטית של התיאור, גם כשמדובר בקיצור או ראשי תיבות נפוצים:

- **מזון**: כל דבר שקשור לאוכל או שתייה — ארוחות (כולל בקיצור: "א. בוקר", "א. צהריים", "א. ערב"), "ארוחת בוקר/צהריים/ערב", "קייטרינג", "חטיפים", "כיבוד", "שתייה", מאפייה, סופרמרקט למזון.
- **הסעות**: הסעה, הסעת מדריכים/חניכים, "אוטובוס"/"אוטובוסים", מונית, רכבת, חברת הסעות.
- **אבטחה ורפואה**: "מע"ר" (מוקד עזרה ראשונה), "חובש"/"חובשת", "מאבטח"/"אבטחה", ציוד עזרה ראשונה, פראמדיק, מד"א.
- **ציוד משרדי**: דפים, עטים, מדפסת/הדפסת מסמכים משרדית, ציוד משרד כללי, קלסרים.
- **ציוד מחנאי**: אוהלים, יתדות, מזרונים, ציוד שטח/מחנאות, תיקי גב, פנסים לשטח.
- **דפוס וטקסטיל**: חולצות (הדפסת חולצות/מיתוג), שלטים, באנרים, הדפסה גרפית/דפוס, מדבקות, תגים מודפסים.
- **רכב**: דלק, חניה, כביש אגרה (למשל "כביש 6"), טיפול/תיקון רכב, שכירת רכב פרטי (לא אוטובוס).
- **השכרת מקום**: השכרת אולם/מתחם/גן אירועים, לינה במלון/כפר נופש, שכירת שטח לאירוע — רק כשמדובר בתשלום עבור המקום/המתחם עצמו, ולא עבור האוכל שמוגש בו.

כלל מכריע: אם התיאור מזכיר סוג ארוחה (בוקר/צהריים/ערב) אפילו בקיצור כמו "א. ערב" — הסיווג הוא תמיד "מזון", גם אם האירוע מתקיים באולם או במתחם מושכר. בחרו את הקטגוריה המתאימה ביותר מתוך הרשימה בלבד — אל תמציאו קטגוריה חדשה, ואל תבחרו לפי שם הספק בלבד אם התיאור עצמו מבהיר קטגוריה שונה.`;
}

export async function POST(request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ type: null });

  const { supplier, description } = await request.json();
  if (!description?.trim()) return NextResponse.json({ type: null });

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_CLASSIFY_MODEL || 'gpt-4o-mini',
        max_tokens: 30,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: `ספק: ${supplier || 'לא צוין'}\nתיאור ההוצאה: ${description}` },
        ],
      }),
    });
    if (!res.ok) return NextResponse.json({ type: null });
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || '';
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return NextResponse.json({ type: null }); }
    const type = EXPENSE_TYPES.includes(parsed.type) ? parsed.type : null;
    return NextResponse.json({ type });
  } catch {
    return NextResponse.json({ type: null });
  }
}
