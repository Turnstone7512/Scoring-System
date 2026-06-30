alter table public.student_measurements
  alter column student_id drop not null,
  add column if not exists person_type text not null default 'STUDENT',
  add column if not exists person_key text,
  add column if not exists person_name text,
  add column if not exists gender text,
  add column if not exists waist_cm numeric(5, 2);

alter table public.student_measurements
  drop constraint if exists student_measurements_person_type_check,
  add constraint student_measurements_person_type_check
  check (person_type in ('STUDENT', 'ADMIN'));

alter table public.student_measurements
  drop constraint if exists student_measurements_gender_check,
  add constraint student_measurements_gender_check
  check (gender in ('MALE', 'FEMALE') or gender is null);

create index if not exists student_measurements_person_date_idx
  on public.student_measurements (person_type, person_key, measurement_date desc);

update public.student_measurements sm
set
  person_type = coalesce(sm.person_type, 'STUDENT'),
  person_key = coalesce(sm.person_key, sm.student_id::text),
  person_name = coalesce(sm.person_name, s.name),
  gender = coalesce(sm.gender, s.gender)
from public.students s
where sm.student_id = s.id
  and (sm.person_key is null or sm.person_name is null or sm.gender is null);
