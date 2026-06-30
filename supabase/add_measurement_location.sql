alter table public.student_measurements
  add column if not exists location text;

notify pgrst, 'reload schema';
