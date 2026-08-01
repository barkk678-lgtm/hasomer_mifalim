-- One-time fix: makes your own login account a super_admin so budget-gated tables
-- (expenses, external_income) stop rejecting writes with "row-level security policy" errors.
-- Run step 1 first to find your row, fill in the email in step 2, then run step 2.

-- Step 1 — find your account:
select id, email, role from profiles order by created_at;

-- Step 2 — replace the email below with your own login email from the list above, then run:
update profiles set role = 'super_admin' where email = 'YOUR_LOGIN_EMAIL_HERE';
