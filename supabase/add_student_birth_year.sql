alter table public.students
  add column if not exists birth_year integer;

notify pgrst, 'reload schema';
