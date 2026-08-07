-- Run this once in the Supabase SQL editor.
-- Adds the fields the automatic bus-assignment engine needs: a city for each pickup point and
-- for the destination (free-text place names alone are ambiguous for geocoding — "כיכר העירייה"
-- exists in many cities), plus the required arrival time at the destination.

alter table bus_groups add column if not exists city text;
alter table bus_plans add column if not exists destination_city text;
alter table bus_plans add column if not exists arrival_time text; -- 'HH:MM', 24h
