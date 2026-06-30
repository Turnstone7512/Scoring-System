alter table public.score_items
  drop constraint if exists score_items_type_check;

alter table public.score_items
  add constraint score_items_type_check
  check (type in ('REWARD', 'PENALTY', 'REDEEM'));

notify pgrst, 'reload schema';
