'use client';
import { useRouter } from 'next/navigation';
import { useCalendarEvents } from '../lib/useCalendarEvents';
import { C } from '../lib/designSystem';
import CalendarView from './CalendarView';

export default function CalendarPageView() {
  const { mifalim, loading } = useCalendarEvents();
  const router = useRouter();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-5" style={{ fontFamily: 'Rubik, sans-serif', color: C.forestDark }}>לוח שנה</h1>
      {loading ? (
        <p className="text-sm" style={{ color: C.inkSoft }}>טוען...</p>
      ) : (
        <CalendarView mifalim={mifalim} onOpen={id => router.push(`/mifal/${id}`)} />
      )}
    </div>
  );
}
