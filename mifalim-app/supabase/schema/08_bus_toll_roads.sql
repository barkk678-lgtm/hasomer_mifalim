-- Run this once in the Supabase SQL editor (or via the Supabase MCP connector, if connected).
alter table bus_plans add column if not exists use_toll_roads boolean not null default false;
