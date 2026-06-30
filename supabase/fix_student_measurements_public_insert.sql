grant usage on schema public to anon, authenticated;

grant select on public.student_measurements to anon, authenticated;
grant insert on public.student_measurements to anon, authenticated;
grant update, delete on public.student_measurements to authenticated;

drop policy if exists "student_measurements admin insert" on public.student_measurements;
drop policy if exists "student_measurements public insert" on public.student_measurements;

create policy "student_measurements public insert"
  on public.student_measurements for insert
  to anon, authenticated
  with check (true);
