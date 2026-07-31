-- Demo seed data — 4 mifalim (one of each type) with full fields, plus pricing tiers,
-- external income, expenses (with expense type + supplier so the "לפי סוגי הוצאות" financials
-- view has real variety), and a mega project linking two of them. Purely for visually checking
-- that the list/calendar/financials screens and charts work end to end — safe to delete these
-- rows later once you have real data. Run once (re-running will fail on duplicate ids, by design).

-- Suppliers (shared, system-wide directory)
insert into suppliers (id, name) values
  ('a1111111-1111-1111-1111-111111111111', 'קייטרינג השרון'),
  ('a2222222-2222-2222-2222-222222222222', 'הסעות גליל'),
  ('a3333333-3333-3333-3333-333333333333', 'ציוד קמפינג בע"מ'),
  ('a4444444-4444-4444-4444-444444444444', 'דפוס מהיר'),
  ('a5555555-5555-5555-5555-555555555555', 'כפר נופש הדסים בע"מ'),
  ('a6666666-6666-6666-6666-666666666666', 'מד"א אזורי');

-- 1. Day trip
insert into mifalim (id, type, name, lead_role, target_audience, target_municipalities, comments, work_start_date, date_mode, status, trip_type, event_date, backup_date, accommodation, routes)
values (
  '11111111-1111-1111-1111-111111111111', 'day_trip', 'טיול חג המעלות - שכבת ז''',
  'ר'' תחום טיילנות', array['כיתה ז''', 'כיתה ח'''], array['לב השרון', 'דרום שרון'],
  'טיול שנתי מסורתי לשכבת ז''', '2026-05-01', 'original', 'בעבודה',
  'חג מעלות', '2026-07-12', '2026-07-19', 'נחל קנה', 'מסלול טבע קצר, מתאים לכל הגילאים'
);

-- 2. Multi-day camp
insert into mifalim (id, type, name, lead_role, target_audience, target_municipalities, comments, work_start_date, date_mode, status, camp_type, start_date, end_date, backup_start_date, backup_end_date, accommodation, routes)
values (
  '22222222-2222-2222-2222-222222222222', 'multi_day', 'מחנה קיץ תשפ''ז',
  'מנהלת מחלקת הדרכה והגשמה', array['כיתה ח''', 'כיתה ט'''], array['עמק יזרעאל', 'גולן'],
  'מחנה הקיץ המרכזי של השנה', '2026-04-01', 'original', 'בעבודה',
  'מחנה קיץ', '2026-08-01', '2026-08-07', '2026-08-08', '2026-08-14', 'כפר נופש הדסים', 'טיולים יומיים באזור'
);

-- 3. Seminar
insert into mifalim (id, type, name, lead_role, target_audience, target_municipalities, comments, work_start_date, date_mode, status, seminar_type, start_date, end_date, accommodation)
values (
  '33333333-3333-3333-3333-333333333333', 'seminar', 'סמינר פתיחת שנה תשפ''ז',
  'ס'' מזכ"ל', array['שנת שירות'], array['רמת נגב'],
  'סמינר הכשרה למדריכים בפתיחת השנה', '2026-06-01', 'original', 'מתוכנן',
  'סמינר פתיחת שנה', '2026-09-04', '2026-09-06', 'מצפה רמון'
);

-- 4. Preparation, linked to the summer camp above (parent_mifal_id)
insert into mifalim (id, type, name, lead_role, target_municipalities, comments, work_start_date, date_mode, status, prep_date_mode, parent_mifal_id, event_date, backup_date)
values (
  '44444444-4444-4444-4444-444444444444', 'preparation', 'הכנת מדריכים - מחנה קיץ',
  'מנהלת מחלקת הדרכה והגשמה', array['עמק יזרעאל', 'גולן'],
  'הכנת צוות ההדרכה למחנה הקיץ', '2026-04-01', 'original', 'בעבודה',
  'single', '22222222-2222-2222-2222-222222222222', '2026-07-20', null
);

-- Pricing tiers (registration income)
insert into pricing_tiers (mifal_id, age_group, price_per_participant, expected_participants, actual_participants) values
  ('11111111-1111-1111-1111-111111111111', 'כיתה ז''', 45, 120, 110),
  ('11111111-1111-1111-1111-111111111111', 'כיתה ח''', 45, 80, 75),
  ('22222222-2222-2222-2222-222222222222', 'כיתה ח''', 900, 60, 55),
  ('22222222-2222-2222-2222-222222222222', 'כיתה ט''', 900, 40, 38),
  ('33333333-3333-3333-3333-333333333333', 'שנת שירות', 350, 30, 28);

-- External income
insert into external_income (owner_type, owner_id, source_name, amount) values
  ('mifal', '11111111-1111-1111-1111-111111111111', 'תרומת ועד הורים', 2000),
  ('mifal', '22222222-2222-2222-2222-222222222222', 'מענק עירייה', 15000);

-- Expenses (with expense type + supplier, for the "לפי סוגי הוצאות" financials view)
insert into expenses (owner_type, owner_id, expense_name, supplier_id, expense_type, quantity, unit_price) values
  ('mifal', '11111111-1111-1111-1111-111111111111', 'ארוחות צהריים בטיול', 'a1111111-1111-1111-1111-111111111111', 'מזון', 190, 25),
  ('mifal', '11111111-1111-1111-1111-111111111111', 'הסעה באוטובוסים', 'a2222222-2222-2222-2222-222222222222', 'הסעות', 4, 1800),
  ('mifal', '11111111-1111-1111-1111-111111111111', 'ציוד מחנאות לטיול', 'a3333333-3333-3333-3333-333333333333', 'ציוד מחנאי', 1, 1500),
  ('mifal', '22222222-2222-2222-2222-222222222222', 'ארוחות במחנה', 'a1111111-1111-1111-1111-111111111111', 'מזון', 93, 120),
  ('mifal', '22222222-2222-2222-2222-222222222222', 'הסעה לאתר המחנה', 'a2222222-2222-2222-2222-222222222222', 'הסעות', 2, 3500),
  ('mifal', '22222222-2222-2222-2222-222222222222', 'שכירות מתחם המחנה', 'a5555555-5555-5555-5555-555555555555', 'השכרת מקום', 1, 40000),
  ('mifal', '22222222-2222-2222-2222-222222222222', 'ליווי רפואי', 'a6666666-6666-6666-6666-666666666666', 'אבטחה ורפואה', 1, 6000),
  ('mifal', '33333333-3333-3333-3333-333333333333', 'ארוחות בסמינר', 'a1111111-1111-1111-1111-111111111111', 'מזון', 28, 60),
  ('mifal', '33333333-3333-3333-3333-333333333333', 'הדפסת חוברות', 'a4444444-4444-4444-4444-444444444444', 'דפוס וטקסטיל', 1, 2200),
  ('mifal', '44444444-4444-4444-4444-444444444444', 'ציוד משרדי להכנה', null, 'ציוד משרדי', 1, 500);

-- Occurrences (for the day trip + camp, so the calendar page has more than one bar per mifal)
insert into occurrences (mifal_id, name, start_date, end_date, notes) values
  ('22222222-2222-2222-2222-222222222222', 'יום כיף באתר המים', '2026-08-03', '2026-08-03', 'פעילות אמצע מחנה');

-- Mega project linking the day trip + camp
insert into mega_projects (id, name) values ('55555555-5555-5555-5555-555555555555', 'פרויקט על - קיץ תשפ''ז');
insert into mega_project_links (mega_project_id, mifal_id) values
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111'),
  ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222');
insert into external_income (owner_type, owner_id, source_name, amount) values
  ('mega_project', '55555555-5555-5555-5555-555555555555', 'תקציב מרכזי', 5000);
insert into expenses (owner_type, owner_id, expense_name, expense_type, quantity, unit_price) values
  ('mega_project', '55555555-5555-5555-5555-555555555555', 'עלות תפעול כללית', 'ציוד משרדי', 1, 3000);
