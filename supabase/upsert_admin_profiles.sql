-- Run this after the matching users already exist in Supabase Authentication.
insert into public.profiles (id, display_name, role)
values
  ('56269765-17f0-4e62-a6d1-f814230248c7', 'Grandma', 'ADMIN'),
  ('6d2e552b-1ad4-4081-a580-376e2232e82e', 'Gink', 'ADMIN'),
  ('6149176c-c8e7-4e99-98e1-8414d61b6ebb', 'Lelia', 'ADMIN')
on conflict (id) do update
set
  display_name = excluded.display_name,
  role = excluded.role;
