alter table public.audit_logs
  add column if not exists changed_by_id uuid references auth.users(id) on delete set null,
  add column if not exists changed_by_account text;
