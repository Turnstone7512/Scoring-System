create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'VIEWER' check (role in ('ADMIN', 'VIEWER')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grade integer not null,
  class_no text,
  email text,
  photo_url text,
  current_score integer not null default 0,
  last_transaction_at timestamptz,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists students_email_unique_active
  on public.students (lower(email))
  where email is not null and is_deleted = false;

create table if not exists public.score_items (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('REWARD', 'PENALTY', 'REDEEM')),
  student_id uuid references public.students(id),
  main_category text not null,
  sub_category text not null,
  image_url text,
  score integer not null,
  is_pinned boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.score_transactions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  score_item_id uuid references public.score_items(id),
  type text not null check (type in ('REWARD', 'PENALTY', 'REDEEM', 'SETTLEMENT')),
  score_change integer not null,
  settlement_score integer,
  running_total_score integer not null default 0,
  transaction_date timestamptz not null default now(),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists score_transactions_student_id_idx
  on public.score_transactions (student_id);

create index if not exists score_transactions_transaction_date_idx
  on public.score_transactions (transaction_date desc);

create table if not exists public.student_measurements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  measurement_date date not null,
  height_cm numeric(5, 2),
  weight_kg numeric(5, 2),
  location text,
  note text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_measurements_student_date_idx
  on public.student_measurements (student_id, measurement_date desc);

alter table public.score_items
  add column if not exists student_id uuid references public.students(id);

alter table public.score_items
  add column if not exists is_pinned boolean not null default false;

alter table public.score_items
  drop constraint if exists score_items_type_check;

alter table public.score_items
  add constraint score_items_type_check
  check (type in ('REWARD', 'PENALTY', 'REDEEM'));

create index if not exists score_items_student_id_idx
  on public.score_items (student_id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('CREATE', 'UPDATE', 'DELETE')),
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_record_idx
  on public.audit_logs (table_name, record_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'ADMIN'
  );
$$;

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.score_items enable row level security;
alter table public.score_transactions enable row level security;
alter table public.student_measurements enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles select own or admin" on public.profiles;
drop policy if exists "profiles admin insert" on public.profiles;
drop policy if exists "profiles admin update" on public.profiles;
drop policy if exists "profiles admin delete" on public.profiles;

create policy "profiles select own or admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles admin insert"
  on public.profiles for insert
  to authenticated
  with check (public.is_admin());

create policy "profiles admin update"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "profiles admin delete"
  on public.profiles for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "students public read active" on public.students;
drop policy if exists "students admin insert" on public.students;
drop policy if exists "students admin update" on public.students;
drop policy if exists "students admin delete" on public.students;

create policy "students public read active"
  on public.students for select
  to anon, authenticated
  using (is_deleted = false);

create policy "students admin insert"
  on public.students for insert
  to authenticated
  with check (public.is_admin());

create policy "students admin update"
  on public.students for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "students admin delete"
  on public.students for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "score_items public read active" on public.score_items;
drop policy if exists "score_items admin insert" on public.score_items;
drop policy if exists "score_items admin update" on public.score_items;
drop policy if exists "score_items admin delete" on public.score_items;

create policy "score_items public read active"
  on public.score_items for select
  to anon, authenticated
  using (is_deleted = false);

create policy "score_items admin insert"
  on public.score_items for insert
  to authenticated
  with check (public.is_admin());

create policy "score_items admin update"
  on public.score_items for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "score_items admin delete"
  on public.score_items for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "score_transactions public read active" on public.score_transactions;
drop policy if exists "score_transactions admin insert" on public.score_transactions;
drop policy if exists "score_transactions admin update" on public.score_transactions;
drop policy if exists "score_transactions admin delete" on public.score_transactions;

create policy "score_transactions public read active"
  on public.score_transactions for select
  to anon, authenticated
  using (is_deleted = false);

create policy "score_transactions admin insert"
  on public.score_transactions for insert
  to authenticated
  with check (public.is_admin());

create policy "score_transactions admin update"
  on public.score_transactions for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "score_transactions admin delete"
  on public.score_transactions for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "student_measurements public read active" on public.student_measurements;
drop policy if exists "student_measurements admin insert" on public.student_measurements;
drop policy if exists "student_measurements admin update" on public.student_measurements;
drop policy if exists "student_measurements admin delete" on public.student_measurements;

create policy "student_measurements public read active"
  on public.student_measurements for select
  to anon, authenticated
  using (is_deleted = false);

create policy "student_measurements admin insert"
  on public.student_measurements for insert
  to authenticated
  with check (public.is_admin());

create policy "student_measurements admin update"
  on public.student_measurements for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "student_measurements admin delete"
  on public.student_measurements for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "audit_logs public read" on public.audit_logs;
drop policy if exists "audit_logs admin insert" on public.audit_logs;

create policy "audit_logs public read"
  on public.audit_logs for select
  to anon, authenticated
  using (true);

create policy "audit_logs admin insert"
  on public.audit_logs for insert
  to authenticated
  with check (public.is_admin());

grant usage on schema public to anon, authenticated;

grant select on public.students to anon, authenticated;
grant insert, update, delete on public.students to authenticated;

grant select on public.score_items to anon, authenticated;
grant insert, update, delete on public.score_items to authenticated;

grant select on public.score_transactions to anon, authenticated;
grant insert, update, delete on public.score_transactions to authenticated;

grant select on public.student_measurements to anon, authenticated;
grant insert, update, delete on public.student_measurements to authenticated;

grant select on public.audit_logs to anon, authenticated;
grant insert on public.audit_logs to authenticated;

grant select, insert, update, delete on public.profiles to authenticated;

alter table public.score_transactions
  alter column score_item_id drop not null;

alter table public.score_transactions
  add column if not exists settlement_score integer;

alter table public.score_items
  add column if not exists student_id uuid references public.students(id);

create index if not exists score_items_student_id_idx
  on public.score_items (student_id);

alter table public.score_transactions
  drop constraint if exists score_transactions_type_check;

alter table public.score_transactions
  add constraint score_transactions_type_check
  check (type in ('REWARD', 'PENALTY', 'REDEEM', 'SETTLEMENT'));

create or replace function public.recalc_student_totals_(p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tx record;
  total integer := 0;
  last_at timestamptz := null;
  adjusted_change integer;
begin
  for tx in
    select *
    from public.score_transactions
    where student_id = p_student_id
      and is_deleted = false
    order by transaction_date asc, created_at asc, id asc
  loop
    if tx.score_item_id is null and tx.settlement_score is not null then
      adjusted_change := tx.settlement_score - total;
      total := tx.settlement_score;
    else
      adjusted_change := tx.score_change;
      total := total + coalesce(tx.score_change, 0);
    end if;

    last_at := tx.transaction_date;

    update public.score_transactions
    set
      type = case
        when tx.score_item_id is null and tx.settlement_score is not null then 'SETTLEMENT'
        else type
      end,
      score_change = adjusted_change,
      running_total_score = total,
      updated_at = now()
    where id = tx.id;
  end loop;

  update public.students
  set
    current_score = total,
    last_transaction_at = last_at,
    updated_at = now()
  where id = p_student_id;
end;
$$;

create or replace function public.admin_recalc_student(p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin permission is required.';
  end if;

  perform public.recalc_student_totals_(p_student_id);
end;
$$;

create or replace function public.admin_delete_score_transaction(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_student_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin permission is required.';
  end if;

  select student_id
  into target_student_id
  from public.score_transactions
  where id = p_id;

  if target_student_id is null then
    raise exception 'Transaction not found.';
  end if;

  update public.score_transactions
  set
    is_deleted = true,
    updated_at = now()
  where id = p_id;

  perform public.recalc_student_totals_(target_student_id);
end;
$$;

grant execute on function public.admin_recalc_student(uuid) to authenticated;
grant execute on function public.admin_delete_score_transaction(uuid) to authenticated;

update public.score_transactions
set settlement_score = running_total_score
where score_item_id is null
  and settlement_score is null;

update public.score_transactions
set type = 'SETTLEMENT'
where score_item_id is null
  and settlement_score is not null;

do $$
declare
  student_record record;
begin
  for student_record in
    select distinct student_id
    from public.score_transactions
  loop
    perform public.recalc_student_totals_(student_record.student_id);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
