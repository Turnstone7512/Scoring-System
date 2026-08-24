create or replace function public.admin_delete_student_measurement(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin permission is required.';
  end if;

  update public.student_measurements
  set
    is_deleted = true,
    updated_at = now()
  where id = p_id;

  if not found then
    raise exception 'Student measurement not found.';
  end if;
end;
$$;

grant execute on function public.admin_delete_student_measurement(uuid) to authenticated;
