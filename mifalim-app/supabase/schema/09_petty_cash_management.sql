-- "ניהול יתרות" (petty cash) — a place to record direct expenses that don't belong to any
-- specific mifal/mega-project, plus a record of balances transferred in from mifalim that have
-- financially closed (the only way money enters petty cash — there's no direct-income concept;
-- external_income/owner_type='general' was added below for symmetry but the app never uses it).
-- Applied directly to the live project via the Supabase MCP connector —
-- this file documents what was run, per the numbered-schema-file convention; do not re-run it
-- as-is against a database that already has these objects (most statements are idempotent via
-- `if not exists` / `add value if not exists` where Postgres supports it, but the enum-value
-- addition below is not transactional-safe to blindly repeat — see note there).

-- ============================================================================
-- 1. New budget_owner_type value: 'general' — a transaction with no mifal/mega-project owner
--    (owner_id is NULL for these rows; see the CHECK constraints below).
-- ============================================================================
-- Postgres requires ALTER TYPE ... ADD VALUE to run outside a transaction block and (on older
-- versions) can't run in the same transaction as code that uses the new value. Run this
-- statement alone if replaying manually.
alter type budget_owner_type add value if not exists 'general';

-- ============================================================================
-- 2. expenses / external_income: owner_id becomes nullable, plus an independent occurred_at.
--    Regular mifal/mega-project rows already have an implicit date via their owner's own event
--    date; petty-cash ("general") rows have no such context, so they need their own date to
--    support a time-series view.
-- ============================================================================
alter table expenses alter column owner_id drop not null;
alter table expenses add column if not exists occurred_at timestamptz;
alter table expenses add constraint expenses_general_consistency check (
  (owner_type = 'general' and owner_id is null and occurred_at is not null) or
  (owner_type <> 'general' and owner_id is not null)
);

alter table external_income alter column owner_id drop not null;
alter table external_income add column if not exists occurred_at timestamptz;
alter table external_income add constraint external_income_general_consistency check (
  (owner_type = 'general' and owner_id is null and occurred_at is not null) or
  (owner_type <> 'general' and owner_id is not null)
);

-- ============================================================================
-- 3. mifal_balance_transfers — one row per mifal financially closed into petty cash.
--    amount can be negative (a mifal that ended in deficit draws DOWN the petty cash balance).
-- ============================================================================
create table if not exists mifal_balance_transfers (
  id             uuid primary key default gen_random_uuid(),
  mifal_id       uuid not null references mifalim(id) on delete cascade,
  amount         numeric not null default 0,
  note           text,
  transferred_by uuid references profiles(id),
  transferred_at timestamptz not null default now()
);
create index if not exists idx_mifal_balance_transfers_mifal on mifal_balance_transfers(mifal_id);

alter table mifal_balance_transfers enable row level security;
create policy "mifal_balance_transfers: admin read" on mifal_balance_transfers
  for select using (is_admin_or_super());
create policy "mifal_balance_transfers: admin write" on mifal_balance_transfers
  for insert with check (is_admin_or_super());
create policy "mifal_balance_transfers: admin update" on mifal_balance_transfers
  for update using (is_admin_or_super());
create policy "mifal_balance_transfers: admin delete" on mifal_balance_transfers
  for delete using (is_admin_or_super());

-- ============================================================================
-- 4. mifalim.balance_transferred_at — set once a mifal's balance has been transferred, to lock
--    it against a duplicate transfer.
-- ============================================================================
alter table mifalim add column if not exists balance_transferred_at timestamptz;

-- ============================================================================
-- 5. transfer_mifal_balance() — atomically compute a mifal's actual balance, record it as a
--    transfer, and lock the mifal. admin/super_admin only; raises if already transferred.
--
--    Balance = external_income + pricing-tier/registration income (actual_participants × price)
--    minus expenses — this MUST match the "יתרה בפועל" shown elsewhere in the app (mifal header,
--    BudgetTab, annual financials), or a transfer silently records the wrong number. The first
--    version of this function omitted pricing-tier income entirely, which — for any mifal whose
--    income comes mainly from registration rather than the "הכנסות נוספות" table (the normal
--    case) — collapsed the transferred amount to just -expenses. Fixed live via migration
--    fix_transfer_mifal_balance_include_tiers_income; the one bad transfer already recorded
--    (the תשפ'ז seminar) was corrected by hand to the true balance.
-- ============================================================================
create or replace function transfer_mifal_balance(p_mifal_id uuid, p_note text default null)
returns numeric
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_balance numeric;
  v_already timestamptz;
begin
  if not is_admin_or_super() then
    raise exception 'not authorized';
  end if;

  select balance_transferred_at into v_already from mifalim where id = p_mifal_id for update;

  if v_already is not null then
    raise exception 'mifal already transferred';
  end if;

  select
    coalesce((select sum(amount) from external_income where owner_type = 'mifal' and owner_id = p_mifal_id), 0)
    + coalesce((select sum(actual_participants * price_per_participant) from pricing_tiers where mifal_id = p_mifal_id), 0)
    - coalesce((select sum(coalesce(quantity, 0) * coalesce(unit_price, 0)) from expenses where owner_type = 'mifal' and owner_id = p_mifal_id), 0)
  into v_balance;

  insert into mifal_balance_transfers (mifal_id, amount, note, transferred_by)
  values (p_mifal_id, v_balance, p_note, auth.uid());

  update mifalim set balance_transferred_at = now() where id = p_mifal_id;

  return v_balance;
end;
$$;

-- ============================================================================
-- 6. reopen_mifal_balance() — undoes a transfer: deletes the mifal's balance_transfers row(s)
--    and clears balance_transferred_at so its budget can be edited again. admin/super_admin
--    only. Deliberately NOT a delta/correction transfer (append a second row alongside the
--    first) — it fully removes the prior transfer so a subsequent close recomputes and records
--    the balance fresh, with no risk of double-counting the same mifal twice in the petty cash
--    total. Added live via migration add_reopen_mifal_balance (this one is genuinely new, unlike
--    sections 1-5 above which only document changes already applied).
-- ============================================================================
create or replace function reopen_mifal_balance(p_mifal_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not is_admin_or_super() then
    raise exception 'not authorized';
  end if;

  delete from mifal_balance_transfers where mifal_id = p_mifal_id;
  update mifalim set balance_transferred_at = null where id = p_mifal_id;
end;
$$;
