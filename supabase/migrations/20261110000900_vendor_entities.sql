-- Vendor entities: one account can run several STAY or VIBE businesses.
-- An entity is a vendor_profiles row, which already carries its own status, documents and listings.
-- MOVE stays at one profile per account. A business name is unique within an account and category
-- for STAY and VIBE, so a vendor can tell their entities apart; the app requires the name.

alter table public.vendor_profiles
  drop constraint vendor_profiles_account_id_category_key;

create unique index vendor_profiles_one_move
  on public.vendor_profiles (account_id)
  where category = 'move';

create unique index vendor_profiles_entity_name
  on public.vendor_profiles (account_id, category, lower(btrim(business_name)))
  where category in ('stay', 'vibe') and business_name is not null;
