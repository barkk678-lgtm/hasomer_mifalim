-- Run this once in the Supabase SQL editor (or via the Supabase MCP connector, if connected).
-- Replaces the free-text city fields from 06_bus_geo_fields.sql with a place_id captured when
-- picking a real suggestion from Google Places Autocomplete — exact and unambiguous, instead of
-- relying on the user typing a matching city alongside the pickup point.

alter table bus_groups drop column if exists city;
alter table bus_groups add column if not exists place_id text;

alter table bus_plans drop column if exists destination_city;
alter table bus_plans add column if not exists destination_place_id text;
-- arrival_time (added in 06_bus_geo_fields.sql) is unaffected and stays as-is.
