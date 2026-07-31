// Design tokens and reference data, carried over as-is from the original design
// (mifalim-system.jsx) so every real, Supabase-backed screen keeps the same look.
import { Compass, Tent, Users, Wrench } from 'lucide-react';

export const C = {
  paper: '#EEEEE4', surface: '#FFFFFF', ink: '#20261C', inkSoft: '#5B6151',
  forest: '#2E4A2A', forestDark: '#1E331B', forestLight: '#4C6B45',
  ochre: '#B07F27', ochreSoft: '#E8D3A5', rust: '#9A3E2E', rustSoft: '#F2D9D2',
  sage: '#C7CDB8', line: '#DAD8C7', greenGood: '#3C6B3F', greenGoodSoft: '#DCE9D6',
  amber: '#C79A2E', amberSoft: '#F5E6BE', steel: '#4C6B8E', steelSoft: '#D9E2EC',
  linkBlue: '#2258C9',
};

export const NUMFONT = { fontFamily: 'Heebo, sans-serif' };
export const DONUT_COLORS = [C.forest, '#8FA05C', C.steel, '#A98FC7', '#B0AEA0'];

export const LEAD_ROLES = ['מנהל מחלקת מפעלים', "ר' תחום טיילנות", 'מנהלת מחלקת הדרכה והגשמה', 'רכז שנת שירות', 'מנהל מחוז דרום', 'מנהל מחוז צפון', 'מנהל מחוז מרכז', 'ס\' מזכ"ל', 'מזכ"ל'];
export const AUDIENCE_ROWS = [
  ["כיתה ד'", "כיתה ה'", "כיתה ו'", "כיתה ז'", "כיתה ח'"],
  ["כיתה ט'", "כיתה י'", 'כיתה י"א', 'כיתה י"ב', 'שנת שירות', 'בוגרים'],
];
export const DISTRICTS = {
  'מחוז מרכז': ['לב השרון', 'דרום שרון', 'עמק חפר', 'צורן', 'ברנר', 'גזר'],
  'מחוז דרום': ['באר טוביה', 'מטה יהודה', 'ערבה', 'לכיש', 'רמת נגב'],
  'מחוז צפון': ['גליל תחתון', 'עמק יזרעאל', 'גולן', 'חוף כרמל'],
};
export const ALL_MUNICIPALITIES = Object.values(DISTRICTS).flat();
export const TRIP_TYPES = ['חג מעלות', 'טיול חנוכה', 'א"ש לילה'];
export const CAMP_TYPES = ['מחנה פסח', 'מחנה קיץ', 'יוסי יפה', 'טיול חנוכה', 'טיול חורף'];
export const SEMINAR_TYPES = ['סמינר פתיחת שנה', 'סמינר התעוררות', "סמינרי ט'", 'סמינר מד"מים', 'סמינר מש"צים', 'מרכז הערכה לגרעין עודד'];

export const STATUS_OPTIONS = ['מתוכנן', 'בעבודה', 'ממתין להפקת לקחים', 'הסתיים', 'בוטל'];
export const STATUS_TONE = { 'מתוכנן': 'forest', 'בעבודה': 'ochre', 'ממתין להפקת לקחים': 'amber', 'הסתיים': 'good', 'בוטל': 'rust' };

export const ALL_TYPES = {
  day_trip: { label: 'טיול חד יומי', icon: Compass },
  multi_day: { label: 'טיול רב יומי / מחנה', icon: Tent },
  seminar: { label: 'סמינר', icon: Users },
  preparation: { label: 'הכנת מדריכים', icon: Wrench },
};
