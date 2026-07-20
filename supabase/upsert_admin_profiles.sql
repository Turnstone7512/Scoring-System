-- Run this after the matching users already exist in Supabase Authentication.
insert into public.profiles (id, display_name, role)
values
  ('3198918b-d4cb-4b21-9c9a-807a0ca49131', 'Grandma', 'ADMIN'),
  ('6d2e552b-1ad4-4081-a580-376e2232e82e', 'Gink', 'ADMIN'),
  ('6149176c-c8e7-4e99-98e1-8414d61b6ebb', 'Lelia', 'ADMIN')
on conflict (id) do update
set
  display_name = excluded.display_name,
  role = excluded.role;
