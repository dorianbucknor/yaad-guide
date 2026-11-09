-- Dining vendors can upload a health permit: a Food Handler's Permit for street food or a
-- cookshop, an Establishment or Health Permit for a restaurant. It is optional, never gates
-- submitting or approving a profile, and only earns the Trusted badge once an admin checks it.

alter table public.vendor_documents drop constraint vendor_documents_doc_type_check;
alter table public.vendor_documents drop constraint vendor_documents_shape;
alter table public.vendor_documents drop constraint vendor_documents_expiry;

alter table public.vendor_documents add constraint vendor_documents_doc_type_check
  check (doc_type in ('government_id', 'jtb_license', 'insurance', 'fitness',
    'business_registration', 'venue_permit', 'health_permit'));

alter table public.vendor_documents add constraint vendor_documents_shape check (
  (doc_type = 'government_id' and vendor_profile_id is null and vehicle_id is null)
  or (doc_type in ('jtb_license', 'business_registration', 'venue_permit', 'health_permit')
      and vendor_profile_id is not null and vehicle_id is null)
  or (doc_type in ('insurance', 'fitness') and vendor_profile_id is null and vehicle_id is not null)
);

-- Expiry is optional for the VIBE documents.
alter table public.vendor_documents add constraint vendor_documents_expiry check (
  doc_type in ('government_id', 'business_registration', 'venue_permit', 'health_permit')
  or expires_on is not null
);

create unique index vendor_documents_one_health_permit
  on public.vendor_documents (vendor_profile_id) where doc_type = 'health_permit';
