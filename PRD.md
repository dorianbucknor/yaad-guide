# Product Requirements

YaadGuide: "Your Digital Travel Agent". A multi-sided marketplace and itinerary planner for Free Independent Travelers (FITs) visiting Jamaica. Founders: Dorian (lead architect) and Kaija.

## Problem

- Planning a non-all-inclusive trip to Jamaica (boutique stays, safe local transport, authentic events) is fragmented, slow and stressful.
- Independent local operators (JTB-licensed drivers, boutique hosts, event promoters) lack simple digital channels to earn international spend before visitors arrive.
- USP: pre-vetted local options and step-by-step itinerary planning in one place, with direct operator access and money flowing to everyday Jamaicans. Unlike generic AI tools or Viator and Booking.com.

## Users

Pillars: **STAY** (accommodation), **MOVE** (transport), **VIBE** (events, attractions, dining; dining is a `DINE` subtype of VIBE shown as its own filter).

### Traveler (FIT)
- Plans and books their own trip. May already be at an all-inclusive hotel and still plan and book events, drivers and so on.
- Browses and builds an itinerary as a guest, with the draft kept in the browser. Sees a pre-checkout page with an estimated price range before any sign-in. Signs up (email/password or Google) only to save the itinerary or check out.
- Builds an itinerary for free, then pays at checkout once planning is complete.
- Pays vendors through YaadGuide (WiPay). Prices are set in USD or JMD (see Pricing and currency).
- Can review a listing only after a completed booking for it (verified reviews only).
- After a booking is confirmed, sees the vendor's phone number and email, and for a STAY or VIBE listing an "Open in maps" button that opens the device's map app at the exact location. Before that, only the area name is shown. Listings show no map.

### Vendor
- Individuals can sign up; no registered business required.
- One person, one login. The account holds name, phone, email and government ID, which are the same whatever they sell.
- Up to three vendor profiles per account, one per category (MOVE, STAY or VIBE). Each profile has a category, a business name, its own verification status, its own listings, ratings and reviews. The rule is one profile per category per person, which also means a person can sign up for MOVE only once. The business name is optional and need not differ between profiles; uniqueness is on person plus category, not on the name.
- Signs up with email/password or Google, with role `vendor`.
- Starts from "Become a vendor" (`/auth/vendor`): creates the account (name, email, password or Google, phone, verified by a code), then completes a vendor profile in a stepped flow at `/vendor` that saves a draft at each step, so the vendor can leave and resume. The vendor submits the profile for review when every required item is in; it is locked while pending. A rejected profile shows the admin's reason and the vendor fixes and resubmits. Vendors see approval, rejection and reasons in the app; email notices come later (see Won't).
- Builds draft listings before approval. Listings are visible and bookable only after an admin approves that vendor profile (approval is per profile, not per person).
- Verification documents (reviewed manually by an admin):
  - MOVE (drivers): JTB license, government ID, and at least one vehicle (type, make, model, year, plate, passenger capacity) with its own insurance certificate and fitness certificate. Vehicle types: Sedan, SUV, Minivan, Station Wagon/Hatchback, Bus, Coach. A driver can register several vehicles but operates one at a time; the active vehicle needs approved certificates. A plate is unique across the platform, and a vehicle changes owner only through a transfer that the new owner requests, the current owner agrees to, and an admin approves. The driver names a primary region, which is informational and never limits where they can work.
  - Every document that lapses (JTB license, insurance, fitness certificate) is uploaded with its expiry date. Files are PDF, JPG or PNG, up to 5 MB, kept private and viewed by admins only.
  - STAY (hosts): government ID, proof of ownership or management, JTB license or registration; business registration optional. The host pins the property's exact location on a Google map (geopoint); the map appears only in that pin picker.
  - VIBE events: government ID and a JCF permit, required for every event for now. VIBE vendors also pin the venue's exact location on a map (geopoint).
  - VIBE attractions and dining: government ID, plus a business registration or permit where one applies (TODO(bootstrap): confirm what each needs).
- Vendor phone number is a required account field.
- A vendor adds another category later from the dashboard, which asks only for that profile's details and documents; the account fields are not asked again.

### Admin
- Dorian and Kaija. Role assigned in the database, never via signup.
- Approves vendors, grants sponsored slots, handles vendor payouts for now.

## Features

### Must (v1)

- **Browse and search** STAY, MOVE and VIBE listings with filters (area, date, price, category), "Trusted" (verified) badge and star ratings.
- **Itinerary builder**: free to build; checkout after planning is complete. Guests can build without an account (draft stored in the browser).
  - An itinerary is an ordered sequence of cards: STAY, MOVE and VIBE. Each card has its own date or dates (STAY a date range, MOVE a pickup date and time, VIBE a single date).
  - Between any two cards there is a "+" to insert a VIBE or a MOVE, for example a driver from hotel to event and back, event to event, or to an attraction.
  - The landing-page quick-start only captures a first draft: a MOVE pickup, a STAY date range, and VIBE interests as chips. The plan page turns the interests into suggested VIBE options; each one added becomes its own card with its own date.
  - TODO(bootstrap): rules for ordering, conflicts between dates, and removing cards. To be designed in the builder cycle.
- **Pre-checkout estimate**: before sign-in, a page showing an estimated price range for the itinerary. TODO(bootstrap): how the range is calculated (listed prices, fees, ranges per item).
- **Landing page**: a quick-start (local transport with pickup date and time, stay with a date range, things to do as interest chips) that creates a prefilled guest itinerary; the three pillars; a "Become a vendor" entry; a "Download the App" coming-soon placeholder. English only in v1.
- **Booking and checkout**
  - STAY: instant confirmation against inventory. Multiple room types per listing, each with its own price and calendar.
  - VIBE: instant confirmation against capacity per date or time slot (tickets or seats). Dining listings have a booking mode: reservation, prepaid experience, or listing only (no booking).
  - MOVE: vendor approval. The traveler requests, the vendor accepts or declines within a time limit, and payment is taken only on acceptance. The limit is 24 hours, or half the time left before pickup if that is shorter, and never less than 1 hour; so a pickup must be at least 2 hours away to request. A request nobody answers in time expires and the traveler is told. Includes taxi, personal driver, and Re-book Driver. Drivers set service areas, vehicle capacity, base prices and blocked dates; no inventory.
  - **MOVE listing (v1).** One listing per vendor. A vendor drives one vehicle at a time (their current vehicle, switchable); vehicle tiers and multi-driver fleets are deferred until demand appears. Availability belongs to the vendor, so a driver cannot be booked twice at once.
    - Pricing is hybrid: flat prices for common routes between places, plus a formula (base fare, per-km rate, hourly rate for day hire) for any other trip. Trips the formula cannot price are custom quotes.
    - Availability is a weekly schedule (days and hours) plus blocked dates and times. The calendar supports multi-day range selection for blocking and unblocking. A pause switch hides the listing and refuses new requests; confirmed trips still stand.
    - Coverage is a set of places the vendor serves (airports, towns, resort areas) chosen from an admin-maintained list with coordinates, plus an island-wide switch. A trip is bookable when pickup and drop-off are in the set, whatever it passes through; for multi-stop itineraries every leg must qualify. Vendors can suggest missing places.
    - Capacity is passenger seats plus luggage capacity (large bags and carry-ons). The traveler enters party size and bags, and only vehicles that fit are shown. Extras (child seats, accessibility, air conditioning) are later optional tags.
    - Photos: at least four vehicle photos (front, rear, interior, luggage space), maximum eight. The vendor's profile photo is required for MOVE vendors, must show a real person and doubles as the driver photo. Admin confirms this in the onboarding review; a changed profile photo returns to admin.
    - Publishing: an admin reviews the vendor's first listing. After that the vendor publishes freely, and price and photo changes on live listings are flagged for admin.
    - Requests: the vendor accepts (with an optional note, for example pickup spot) or declines. Declining needs a one-tap reason (dates blocked, too far, vehicle unavailable, other). A request that expires counts against the vendor's response rate. The traveler is told at once and offered similar vendors. No counter-offers in v1.
  - **Vendor dashboard (MOVE).** The first screen is the requests inbox: pending requests with a countdown to the response deadline and Accept and Decline actions, then upcoming trips, then listing, calendar and settings. The design follows a bento layout: dark map hero (MapLibre with OpenFreeMap tiles for now, behind one `DashboardMap` component; the stylized-map project in `region-map-kit` may replace it), a segmented status bar, a response-performance chart, a requests table with filter pills and status chips, and a gradient earnings card that stays empty until payments exist. No fake data.
- **Pricing and currency**
  - A vendor sets each price in USD or JMD, and that amount as entered is the source of truth; it never changes unless the vendor changes it. Fixed YaadGuide amounts (the planning fee, sponsored listing price) are defined in USD.
  - Travelers can view prices in USD, JMD, BBD, XCD, GYD, TTD, CAD, GBP or EUR, chosen in preferences. Anything outside the listing's own currency is an estimate labeled "about", worked out from one daily rate table with USD as the base. A rate saved when a listing was created is kept for audit only and is not used for display.
  - Travelers are charged in USD or JMD only, in v1. WiPay's other country platforms support BBD, XCD, GYD and TTD; charging in those can be added later without a redesign if our account supports them. CAD, GBP and EUR are display-only because WiPay does not support them.
  - Before paying, the traveler sees the exact amount in the charge currency. Each booking stores the charge currency, the amount, the exchange rate used and its date; refunds and payouts use that stored snapshot.
- **Payments** via WiPay into YaadGuide's account, then manual payout to vendors (WiPay has no split payout yet). Payout rules:
  - MOVE: after the service is delivered.
  - STAY: 24 hours after check-in (modeled on Airbnb).
  - VIBE: immediately (mainly ticket purchases).
- **Fees**
  - Traveler planning fee: US$20 per trip, charged once at checkout, waived for VIBE-only trips. Fixed at $20 for launch and held in configuration so it can be raised later with conversion data.
  - Vendor commission: 10% for MOVE, STAY and VIBE, held in configuration. It applies only to vendor-owned listings. External listings (API or house-account, see "House account and external listings") never get the 10% added on top: their margin is the admin-set sale price minus the supplier cost, and listings that already include a commission (affiliate) skip it too. Link-out listings take no payment through YaadGuide, so no commission or processing fee applies.
  - Payment processing fee: paid by the traveler, shown as its own line at checkout (WiPay customer-pays mode), so it never reduces vendor payouts or the margin on external listings. It is calculated on the full charge and is not refunded when a booking is cancelled, unless the cancellation is caused by YaadGuide or the vendor.
  - Refund of the planning fee only if the whole trip is cancelled: 50% up to 24 hours before trip start (the earliest booking date in the trip).
- **Cancellation and refund policy**: set by each vendor per listing from a fixed set, shown to the traveler before paying, with the refund worked out for their exact dates ("Not refundable for this booking" when the service is too close). Tiers count back from the service start (MOVE pickup, STAY check-in, VIBE event time) to the moment of cancelling.
  - STAY and VIBE: Flexible (full refund 24h or more before), Moderate (full 120h or more, 50% from 24h to 120h), Strict (50% 168h or more, none after). A 1-hour grace period after paying gives a full refund if the service is at least 24h away.
  - MOVE: Flexible (full 24h or more before pickup, 50% from 3h to 24h, none inside 3h or on a no-show) and Moderate (full 72h or more, 50% from 24h to 72h, none inside 24h or on a no-show). No grace period. Cancelling before the vendor accepts is free because nothing has been charged. Whatever is not refunded is paid to the vendor, less commission.
  - Planning fee: refunded only when the whole trip is cancelled, 50% up to 24h before the earliest booking (see Fees). Cancelling the last remaining booking counts as cancelling the whole trip.
  - Vendor cancels after accepting: the traveler gets a full refund for that booking, the planning fee stays and the traveler is prompted to rebook that slot; if no paid bookings remain, the planning fee is refunded in full.
- **Vendor dashboard**: listings, availability and inventory, bookings, draft and publish state, verification status.
- **House account and external listings**: a reserved internal vendor called "YaadGuide", managed by admins, owns listings that do not come from a real vendor. Every listing carries a source (`vendor`, `external_api` or `house`) that decides what is allowed: an API-sourced listing may be link-out only (shown as an affiliate listing that opens on the provider's site), while a house ticket listing always has inventory counts and instant confirmation. v1 builds the source marker, the house account, limited stock and link-out display, and admins add link-out listings by hand; connecting the first real provider API is a later cycle once a provider is chosen and its terms are read.
  - Pre-purchased tickets (high-demand events and attractions) are sold from a limited stock per ticket type and date or time slot. An admin enters the quantity, what YaadGuide paid per ticket (reporting only) and the sale price; there is no commission or vendor payout, because YaadGuide is the seller. Starting payment holds the traveler's tickets for 10 minutes; an unfinished payment releases them.
- **Vendor verification**: manual admin review of submitted documents.
- **Reviews**: ratings and reviews from verified bookings only. Imported public reviews (Google and other free APIs) shown in a separate labeled section, excluded from the YaadGuide rating, cached briefly with attribution.
- **Sponsored listings**: admin-granted, US$3.50 per listing per week, one-week minimum, flat across the app, max 3 per category at a time. Shown at the top of search results, on the home page and in itinerary suggestions, with a visible "Sponsored" label. Payment collected outside the app; the app stores dates, price and who placed it.
- **Auth**: Supabase Auth, email/password and Google for travelers and vendors.
- **Account settings** (`/settings`): personal info (name, photo, phone), security (change password, change email, sign-in methods, sign out other devices, delete account) and notification preferences, for every signed-in user. Deleting an account archives it: linked vendor profiles and listings and traveler data are kept for seven days and then permanently deleted; archived accounts are hidden from travelers at once, and signing in during the seven days offers a restore. Notification preferences (email and SMS per category: account and security, bookings, vendor review updates, document expiry reminders, offers and news) are saved now and honored once each feature starts sending; account and security email cannot be turned off. Deleting is blocked while the account has future confirmed bookings (added with bookings).
- **Notifications**: email only.
- **Dark mode.**

### Should

- TODO(bootstrap): none agreed yet. Everything not in Must is scheduled below.

### Won't (for now)

- **v2**: Zion, an AI assistant that helps visitors plan trips.
- **v3**: cruise port day-excursion planner, car-pooling and shared transit, OpenTable integration, native mobile apps, JTB API integration, PR and influencer tooling, flights and cruise tickets, car rental, all-inclusive packages.
- **v3 (landing page upgrade)**: a 3D scene built with Three.js. A 3D cab that drives along the route as the visitor scrolls, and a 3D plane that flies in on page load, replacing the 2D PNG versions used in v1. Needs licensed 3D models (glTF) for both; v1 uses 2D images and an SVG path.
- **v4**: external calendar sync (for example Airbnb iCal).
- **Later**: in-app messaging between travelers and vendors; self-serve sponsored listing purchase; transactional emails (vendor approval or rejection, document expiry reminders, booking notices), which need a transactional email provider and templates.
- "Download the App" on the web is a "coming soon" placeholder in v1.

## Success criteria

- Target: 2% of the FIT segment (about 25,000 active users) within 18 months.
- Onboard the first cohort of 100 verified grassroots merchants through the TEF Incubator.
- TODO(bootstrap): v1 launch metrics (bookings, vendor activation) not defined.

## Open questions

- JCF permit: whether it is required for every event; confirm with the JCF.
- Exact Jamaican document names for VIBE venue proof (tourism licence or permit for attractions, food-handler or health permit for dining); confirm with the relevant authorities. Decided: two levels. To list, a VIBE vendor uploads business registration only (certificate of registration or TRN). Venue proof by type (attraction: licence or permit plus site photo; dining: permit plus premises photo; events: JCF permit if required) is needed only for the Trusted badge. Listings can be live while unverified, shown without the badge.
- Later, not v1: external ratings. Decided: v1 shows only verified YaadGuide reviews (travelers who booked through the platform, after the service), with a "New" label on listings that have none yet. No scraping of Tripadvisor or Google. Later options: AI summaries of YaadGuide's own reviews; an optional Tripadvisor rating badge on STAY and VIBE listing pages only, which needs the current Terra terms and caching policy read first (the legacy policy allowed storing only the location id, required the logo, a link back and unaltered display, and the free tier and review count are unconfirmed).
- WiPay (public pages read November 2026): the Jamaica platform appears to support JMD and USD only (BBD, XCD, GYD and TTD belong to the other countries' platforms); confirm with our own account via the Supported Currencies endpoint. Settlement goes to a verified business bank account in the same name as the WiPay account, in a matching currency, so USD settlement needs a USD bank account. Reported timing is 5 to 10 business days (sources disagree). Withdrawals cost J$500 or US$11 each, which favors batching vendor payouts. A withdrawals API exists (WAPI) but whether it can pay third-party vendor accounts is unconfirmed, and no split-payment endpoint is documented. Email sent to WiPay Jamaica support to confirm settlement currency, timing, conversion rate and third-party payouts.
- Legal documents. Decided: draft four launch documents from this PRD (Terms of Service, Privacy Policy, Vendor Agreement, traveler cancellation and refund page), then have a Jamaican lawyer review them before launch. The review should cover the Data Protection Act (2020), consumer protection, the 7-day account deletion window, holding vendor funds and the vendor agreement. Drafts are a starting point, not legal advice. Not yet drafted.
- Timeline: overview estimates 6 to 7 months development, 4 to 6 weeks QA, 1 to 2 weeks deployment.
