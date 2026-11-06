-- Generic audit trail. Written by trigger only; admins can read.

create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_id text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  actor_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

create policy audit_log_select_admin on public.audit_log
  for select to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_id text;
begin
  if tg_op = 'DELETE' then
    v_old := to_jsonb(old);
    v_id := old.id::text;
  elsif tg_op = 'INSERT' then
    v_new := to_jsonb(new);
    v_id := new.id::text;
  else
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_id := new.id::text;
  end if;

  insert into public.audit_log (table_name, row_id, action, actor_id, old_values, new_values)
  values (tg_table_name, v_id, tg_op, auth.uid(), v_old, v_new);

  return null;
end;
$$;

revoke all on function public.audit_row_change() from public, anon, authenticated;

create trigger profiles_audit
  after insert or update or delete on public.profiles
  for each row execute function public.audit_row_change();
