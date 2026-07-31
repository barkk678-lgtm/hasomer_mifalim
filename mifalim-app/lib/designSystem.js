// Design tokens and shared UI primitives, carried over as-is from the original design
// (mifalim-system.jsx) so every real, Supabase-backed screen keeps the same look.

export const C = {
  paper: '#EEEEE4', surface: '#FFFFFF', ink: '#20261C', inkSoft: '#5B6151',
  forest: '#2E4A2A', forestDark: '#1E331B', forestLight: '#4C6B45',
  ochre: '#B07F27', ochreSoft: '#E8D3A5', rust: '#9A3E2E', rustSoft: '#F2D9D2',
  sage: '#C7CDB8', line: '#DAD8C7', greenGood: '#3C6B3F', greenGoodSoft: '#DCE9D6',
  amber: '#C79A2E', amberSoft: '#F5E6BE', steel: '#4C6B8E', steelSoft: '#D9E2EC',
  linkBlue: '#2258C9',
};

export const NUMFONT = { fontFamily: 'Heebo, sans-serif' };

export const STATUS_OPTIONS = ['מתוכנן', 'בעבודה', 'ממתין להפקת לקחים', 'הסתיים', 'בוטל'];
export const STATUS_TONE = { 'מתוכנן': 'forest', 'בעבודה': 'ochre', 'ממתין להפקת לקחים': 'amber', 'הסתיים': 'good', 'בוטל': 'rust' };
