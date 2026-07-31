-- Any signed-in user can read basic profile info (full_name) of other users —
-- needed to display "uploaded by" on files, and matches the rest of the app
-- (stakeholders, task assignees, etc.) where team members' names are visible
-- to everyone. Full RBAC/visibility restrictions are deferred to the end of
-- the project per the agreed plan; this only widens *read* access to profiles,
-- it does not touch the existing self-read / super_admin policies.
create policy "profiles: authenticated read" on profiles for select using (auth.role() = 'authenticated');
