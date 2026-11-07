-- Deleting the auth user cascades to profiles, vendor rows and documents, and each
-- delete writes a new audit row holding the old values. So the scrub must work from
-- the audit rows themselves (not the live tables) and run again after the delete.

create or replace function public.scrub_audit_for_account(p_account_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.audit_log
  set old_values = null, new_values = null
  where (table_name = 'profiles' and row_id = p_account_id::text)
     or (table_name in ('vendor_profiles', 'vendor_documents')
         and (old_values ->> 'account_id' = p_account_id::text
              or new_values ->> 'account_id' = p_account_id::text))
     or (table_name = 'vendor_vehicles'
         and coalesce(old_values ->> 'vendor_profile_id', new_values ->> 'vendor_profile_id') in (
           select row_id from public.audit_log
           where table_name = 'vendor_profiles'
             and (old_values ->> 'account_id' = p_account_id::text
                  or new_values ->> 'account_id' = p_account_id::text)
           union
           select id::text from public.vendor_profiles where account_id = p_account_id));
$$;
