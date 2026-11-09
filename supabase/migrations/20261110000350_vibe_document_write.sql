-- A VIBE vendor could not upload a business registration, a venue permit or a health permit: the
-- row-level security check on vendor_documents, can_write_document(), knew only three cases (the
-- account's government ID, a MOVE profile's JTB licence, and "anything else is a vehicle document").
-- The new VIBE documents belong to a profile, not a vehicle, so the vehicle branch found no profile
-- and refused them, and the app answered "permission denied".
--
-- They now follow the JTB licence's rule: the vendor's own profile, while it is a draft, rejected or
-- approved (not while it is with an admin). Privileges on the function are kept by `create or replace`.

create or replace function public.can_write_document(
  p_account_id uuid, p_doc_type text, p_profile_id uuid, p_vehicle_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_account_id = (select auth.uid())
    and case
      when p_doc_type = 'government_id' then public.account_unlocked(p_account_id)
      when p_doc_type in ('jtb_license', 'business_registration', 'venue_permit', 'health_permit')
        then public.can_add_to_profile(p_profile_id)
      else public.can_add_to_profile(public.vehicle_profile(p_vehicle_id))
    end;
$$;
