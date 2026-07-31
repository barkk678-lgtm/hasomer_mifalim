'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TableIcon, ListChecks, Layers, Lock, CalendarDays } from 'lucide-react';
import { C } from '../lib/designSystem';
import SignOutButton from './SignOutButton';

// Full nav list matches the original design. Only entries with an `href` are wired to a real
// page so far — the rest are shown as disabled/coming-soon rather than pretending they exist.
const NAV_ITEMS = [
  { key: 'all', label: 'כל המפעלים', icon: TableIcon, href: '/' },
  { key: 'tasks', label: 'משימות מכלל המפעלים', icon: ListChecks, href: '/tasks' },
  { key: 'calendar', label: 'לוח שנה', icon: CalendarDays, href: '/calendar' },
  { key: 'financials', label: 'סיכום יתרות שנתי', href: null },
  { key: 'mega', label: 'פרויקטי על', icon: Layers, href: '/mega' },
];

export default function TopNav({ userEmail, role }) {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-30 w-full" style={{ background: C.forest }}>
      <div className="max-w-7xl mx-auto px-6 flex items-center gap-6 flex-wrap py-3">
        <span className="text-white font-bold text-base shrink-0" style={{ fontFamily: 'Rubik, sans-serif' }}>נוער השומר</span>
        <nav className="flex items-center gap-1 flex-wrap flex-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = item.href && pathname === item.href;
            if (!item.href) {
              return (
                <button
                  key={item.key}
                  disabled
                  title="בקרוב"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: 'transparent', color: '#7C8570', cursor: 'default' }}
                >
                  {item.label}
                  <Lock size={11} />
                </button>
              );
            }
            return (
              <Link
                key={item.key}
                href={item.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={active ? { background: C.ochre, color: '#2A1F08' } : { background: 'transparent', color: '#E4E7DC' }}
              >
                {Icon && <Icon size={14} />}
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: C.forestDark, color: '#C9D0BE' }}>{role}</span>
          <span className="text-xs" style={{ color: '#E4E7DC' }}>{userEmail}</span>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
