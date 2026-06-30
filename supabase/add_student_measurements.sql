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

alter table public.student_measurements
  add column if not exists location text;

alter table public.student_measurements enable row level security;

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

grant select on public.student_measurements to anon, authenticated;
grant insert, update, delete on public.student_measurements to authenticated;

notify pgrst, 'reload schema';
