-- ============================================================================
-- Noar HaShomer — Mifalim MIS: Initial Supabase Schema
-- ============================================================================
-- This mirrors the full data model already built in the React prototype:
-- mifalim, mega projects, tasks, budget (suppliers + expense types), bus
-- logistics, and the 4-tier permission model (super_admin / admin /
-- no_budget / event_specific with per-event budget access).
--
-- HOW TO USE:
-- 1. Open your Supabase project → SQL Editor → New query.
-- 2. Paste this whole file and run it once.
-- 3. Enable Google as an Auth provider under Authentication → Providers.
-- 4. Review/tighten the RLS policies at the bottom before going live —
--    they're a reasonable starting point, not a final security review.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. IDENTITY & PERMISSIONS
-- ============================================================================

create type user_role as enum ('super_admin', 'admin', 'no_budget', 'event_specific');

-- One row per authenticated user (id matches auth.users.id from Supabase Auth).
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text,
  role        user_role not null default 'no_budget',
  created_at  timestamptz not null default now()
);

-- (user_events is created further below, right after `mifalim` exists — see section 2.)

-- ============================================================================
-- 2. MIFALIM (events) & MEGA PROJECTS
-- ============================================================================

create type mifal_type as enum ('day_trip', 'multi_day', 'seminar', 'preparation');
create type mifal_status as enum ('מתוכנן', 'בעבודה', 'ממתין להפקת לקחים', 'הסתיים', 'בוטל');

create table mifalim (
  id                    uuid primary key default gen_random_uuid(),
  type                  mifal_type not null,
  name                  text not null default '',
  lead_role             text,
  target_audience       text[] default '{}',
  target_municipalities text[] default '{}',
  comments              text,
  work_start_date       date,
  date_mode             text default 'original', -- 'original' | 'backup'
  status                mifal_status default 'מתוכנן',

  -- type-specific fields
  trip_type             text,
  camp_type             text,
  seminar_type          text,
  event_date            date,
  backup_date           date,
  start_date            date,
  end_date              date,
  backup_start_date     date,
  backup_end_date       date,
  accommodation         text,
  routes                text,

  -- "הכנת מדריכים" (preparation) records only
  parent_mifal_id       uuid references mifalim(id) on delete cascade,
  prep_date_mode        text, -- 'single' | 'range'

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index idx_mifalim_parent on mifalim(parent_mifal_id);

-- Per-event access + budget visibility, only meaningful when profiles.role = 'event_specific'.
create table user_events (
  user_id           uuid not null references profiles(id) on delete cascade,
  event_id          uuid not null references mifalim(id) on delete cascade,
  has_budget_access boolean not null default false,
  primary key (user_id, event_id)
);

create table mega_projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '',
  created_at  timestamptz not null default now()
);

create table mega_project_links (
  mega_project_id uuid not null references mega_projects(id) on delete cascade,
  mifal_id        uuid not null references mifalim(id) on delete cascade,
  primary key (mega_project_id, mifal_id)
);

-- ============================================================================
-- 3. PRICING / STAKEHOLDERS / TASKS / OCCURRENCES  (all owned by a mifal)
-- ============================================================================

create table pricing_tiers (
  id                    uuid primary key default gen_random_uuid(),
  mifal_id              uuid not null references mifalim(id) on delete cascade,
  age_group             text,
  price_per_participant numeric default 0,
  expected_participants integer default 0,
  actual_participants   integer default 0
);

create table stakeholders (
  id         uuid primary key default gen_random_uuid(),
  mifal_id   uuid not null references mifalim(id) on delete cascade,
  role       text,
  full_name  text,
  email      text
);

create table tasks (
  id           uuid primary key default gen_random_uuid(),
  mifal_id     uuid not null references mifalim(id) on delete cascade,
  task_name    text not null default '',
  assigned_to  text,
  deadline     date,
  is_completed boolean not null default false,
  comments     text,
  created_at   timestamptz not null default now()
);
create index idx_tasks_mifal on tasks(mifal_id);

create table occurrences (
  id         uuid primary key default gen_random_uuid(),
  mifal_id   uuid not null references mifalim(id) on delete cascade,
  name       text,
  start_date date,
  end_date   date,
  notes      text
);

-- ============================================================================
-- 4. BUDGET — suppliers, expense types, income & expenses
--    (owner is either a mifal OR a mega project — modeled with owner_type/owner_id)
-- ============================================================================

create type budget_owner_type as enum ('mifal', 'mega_project');
create type expense_type as enum ('מזון', 'הסעות', 'אבטחה ורפואה', 'ציוד משרדי', 'ציוד מחנאי', 'דפוס וטקסטיל', 'רכב', 'השכרת מקום');

-- System-wide supplier directory (the "creatable select" in the UI reads/writes this table).
create table suppliers (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique
);

create table external_income (
  id          uuid primary key default gen_random_uuid(),
  owner_type  budget_owner_type not null,
  owner_id    uuid not null,
  source_name text,
  amount      numeric default 0
);
create index idx_external_income_owner on external_income(owner_type, owner_id);

create table expenses (
  id            uuid primary key default gen_random_uuid(),
  owner_type    budget_owner_type not null,
  owner_id      uuid not null,
  expense_name  text,
  supplier_id   uuid references suppliers(id),
  expense_type  expense_type,
  quantity      numeric default 0,
  unit_price    numeric default 0,
  notes         text
);
create index idx_expenses_owner on expenses(owner_type, owner_id);

-- ============================================================================
-- 5. FILES  (metadata only — actual bytes live in Supabase Storage)
-- ============================================================================

create table files (
  id           uuid primary key default gen_random_uuid(),
  owner_type   budget_owner_type not null,
  owner_id     uuid not null,
  storage_path text not null, -- path inside a Supabase Storage bucket
  name         text not null,
  size         bigint,
  category     text,
  modified_at  timestamptz not null default now(),
  modified_by  uuid references profiles(id)
);
create index idx_files_owner on files(owner_type, owner_id);

-- ============================================================================
-- 6. BUS LOGISTICS
-- ============================================================================

create table bus_plans (
  id           uuid primary key default gen_random_uuid(),
  mifal_id     uuid not null references mifalim(id) on delete cascade,
  name         text not null default '',
  destination  text,
  created_at   timestamptz not null default now()
);

create table bus_types (
  id           uuid primary key default gen_random_uuid(),
  bus_plan_id  uuid not null references bus_plans(id) on delete cascade,
  label        text not null,
  capacity     integer not null
);

create table bus_groups (
  id            uuid primary key default gen_random_uuid(),
  bus_plan_id   uuid not null references bus_plans(id) on delete cascade,
  group_name    text not null,
  quantity      integer not null default 0,
  pickup_point  text not null
);

-- The interactive allocation board (buses + assigned/unassigned pieces, including split
-- fragments and per-stop pickup times) is complex, nested, and edited constantly via
-- drag-and-drop. Rather than over-normalizing, store the computed board as JSONB — it's
-- derived/working data, not the source of truth (bus_groups above is the source of truth).
create table bus_boards (
  bus_plan_id  uuid primary key references bus_plans(id) on delete cascade,
  board        jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);

-- ============================================================================
-- 7. ROW LEVEL SECURITY — starting point, review before production use
-- ============================================================================

alter table profiles            enable row level security;
alter table user_events         enable row level security;
alter table mifalim             enable row level security;
alter table mega_projects       enable row level security;
alter table mega_project_links  enable row level security;
alter table pricing_tiers       enable row level security;
alter table stakeholders        enable row level security;
alter table tasks               enable row level security;
alter table occurrences         enable row level security;
alter table suppliers           enable row level security;
alter table external_income     enable row level security;
alter table expenses            enable row level security;
alter table files               enable row level security;
alter table bus_plans           enable row level security;
alter table bus_types           enable row level security;
alter table bus_groups          enable row level security;
alter table bus_boards          enable row level security;

-- Helper: current user's role (reads once per statement via a stable function).
create or replace function my_role() returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function is_admin_or_super() returns boolean as $$
  select my_role() in ('super_admin', 'admin');
$$ language sql stable security definer;

create or replace function has_event_budget_access(p_event_id uuid) returns boolean as $$
  select is_admin_or_super() or exists (
    select 1 from user_events
    where user_id = auth.uid() and event_id = p_event_id and has_budget_access = true
  );
$$ language sql stable security definer;

-- Everyone signed in can read/write non-financial mifal data (tighten if that's too open).
create policy "mifalim: authenticated read" on mifalim for select using (auth.uid() is not null);
create policy "mifalim: authenticated write" on mifalim for all using (auth.uid() is not null);

-- Financial tables: gated by the helper above. Reads AND writes both check budget access.
create policy "expenses: budget-gated read" on expenses for select
  using (is_admin_or_super() or has_event_budget_access(owner_id));
create policy "expenses: budget-gated write" on expenses for all
  using (is_admin_or_super() or has_event_budget_access(owner_id));

create policy "external_income: budget-gated read" on external_income for select
  using (is_admin_or_super() or has_event_budget_access(owner_id));
create policy "external_income: budget-gated write" on external_income for all
  using (is_admin_or_super() or has_event_budget_access(owner_id));

-- Only a super_admin may manage the permissions table itself.
create policy "profiles: self read" on profiles for select using (id = auth.uid() or is_admin_or_super());
create policy "profiles: super_admin manages all" on profiles for all using (my_role() = 'super_admin');
create policy "user_events: super_admin manages all" on user_events for all using (my_role() = 'super_admin');

-- Remaining tables (suppliers, tasks, occurrences, stakeholders, pricing_tiers, files,
-- bus_*): default to "any authenticated user" for now — split these out with the same
-- has_event_budget_access() pattern once you decide which of them should be budget-gated too.
create policy "suppliers: authenticated all" on suppliers for all using (auth.uid() is not null);
create policy "tasks: authenticated all" on tasks for all using (auth.uid() is not null);
create policy "occurrences: authenticated all" on occurrences for all using (auth.uid() is not null);
create policy "stakeholders: authenticated all" on stakeholders for all using (auth.uid() is not null);
create policy "pricing_tiers: authenticated all" on pricing_tiers for all using (auth.uid() is not null);
create policy "files: authenticated all" on files for all using (auth.uid() is not null);
create policy "mega_projects: authenticated all" on mega_projects for all using (auth.uid() is not null);
create policy "mega_project_links: authenticated all" on mega_project_links for all using (auth.uid() is not null);
create policy "bus_plans: authenticated all" on bus_plans for all using (auth.uid() is not null);
create policy "bus_types: authenticated all" on bus_types for all using (auth.uid() is not null);
create policy "bus_groups: authenticated all" on bus_groups for all using (auth.uid() is not null);
create policy "bus_boards: authenticated all" on bus_boards for all using (auth.uid() is not null);

-- Auto-create a profile row (default role: no_budget — the safe default) whenever someone
-- signs in via Supabase Auth for the first time.
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'no_budget')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
