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
- Pays vendors through YaadGuide (WiPay). All prices are in USD.
- Can review a listing only after a completed booking for it (verified reviews only).
- After a booking is confirmed, sees the vendor's phone number and email, and for a STAY or VIBE listing an "Open in maps" button that opens the device's map app at the exact location. Before that, only the area name is shown. Listings show no map.

### Vendor
- Individuals can sign up; no registered business required.
- One person, one login. The account holds name, phone, email and government ID, which are the same whatever they sell.
- Up to three vendor profiles per account, one per category (MOVE, STAY or VIBE). Each profile has a category, a business name, its own verification status, its own listings, ratings and reviews. The rule is one profile per category per person, which also means a person can sign up for MOVE only once. The business name is optional and need not differ between profiles; uniqueness is on person plus category, not on the name.
- Signs up with email/password or Google, with role `vendor`.
- Starts from "Become a vendor" (`/auth/vendor`): fills in the information required for their vendor type, which is held in the browser, then signs up. Nothing is saved until sign-up is confirmed, and then it is added to their profile. TODO(bootstrap): fields per vendor type and handling of documents.
- Builds draft listings before approval. Listings are visible and bookable only after an admin approves that vendor profile (approval is per profile, not per person).
- Verification documents (reviewed manually by an admin):
  - MOVE (drivers): JTB license, government ID, vehicle details, and both an insurance certificate and a fitness certificate. Vehicle types: Sedan, SUV, Minivan, Station Wagon/Hatchback, Bus, Coach.
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
  - MOVE: vendor approval. The traveler requests, the vendor accepts or declines within a time limit, and payment is taken only on acceptance. Includes taxi, personal driver, and Re-book Driver. Drivers set service areas, vehicle capacity, base prices and blocked dates; no inventory.
- **Payments** via WiPay into YaadGuide's account, then manual payout to vendors (WiPay has no split payout yet). Payout rules:
  - MOVE: after the service is delivered.
  - STAY: 24 hours after check-in (modeled on Airbnb).
  - VIBE: immediately (mainly ticket purchases).
- **Fees**
  - Traveler planning fee: US$20 per trip, charged once at checkout, waived for VIBE-only trips. Configurable (may be set between $20 and $30).
  - Vendor commission: 10% for MOVE; 10% placeholder for STAY and VIBE (final percentage open). Listings that already include a commission (affiliate) skip the 10%.
  - Refund of the planning fee only if the whole trip is cancelled: 50% up to 24 hours before trip start (the earliest booking date in the trip).
- **Cancellation and refund policy**: set by each vendor per listing from a fixed set (flexible, moderate, strict), shown to the traveler before paying.
- **Vendor dashboard**: listings, availability and inventory, bookings, draft and publish state, verification status.
- **Vendor verification**: manual admin review of submitted documents.
- **Reviews**: ratings and reviews from verified bookings only. Imported public reviews (Google and other free APIs) shown in a separate labeled section, excluded from the YaadGuide rating, cached briefly with attribution.
- **Sponsored listings**: admin-granted, US$3.50 per listing per week, one-week minimum, flat across the app, max 3 per category at a time. Shown at the top of search results, on the home page and in itinerary suggestions, with a visible "Sponsored" label. Payment collected outside the app; the app stores dates, price and who placed it.
- **Auth**: Supabase Auth, email/password and Google for travelers and vendors.
- **Notifications**: email only.
- **Dark mode.**

### Should

- TODO(bootstrap): none agreed yet. Everything not in Must is scheduled below.

### Won't (for now)

- **v2**: Zion, an AI assistant that helps visitors plan trips.
- **v3**: cruise port day-excursion planner, car-pooling and shared transit, OpenTable integration, native mobile apps, JTB API integration, PR and influencer tooling, flights and cruise tickets, car rental, all-inclusive packages.
- **v3 (landing page upgrade)**: a 3D scene built with Three.js. A 3D cab that drives along the route as the visitor scrolls, and a 3D plane that flies in on page load, replacing the 2D PNG versions used in v1. Needs licensed 3D models (glTF) for both; v1 uses 2D images and an SVG path.
- **v4**: external calendar sync (for example Airbnb iCal).
- **Later**: in-app messaging between travelers and vendors; self-serve sponsored listing purchase.
- "Download the App" on the web is a "coming soon" placeholder in v1.

## Success criteria

- Target: 2% of the FIT segment (about 25,000 active users) within 18 months.
- Onboard the first cohort of 100 verified grassroots merchants through the TEF Incubator.
- TODO(bootstrap): v1 launch metrics (bookings, vendor activation) not defined.

## Open questions

- Final traveler planning fee ($20 to $30).
- Final STAY and VIBE commission percentage (10% is a placeholder).
- JCF permit: whether it is required for every event; confirm with the JCF.
- Verification documents for VIBE attractions and dining.
- Which public review APIs and their terms (Google Places is not free and limits storage; check Tripadvisor and others).
- Whether WiPay accepts USD and JMD on one account and supports vendor payouts later.
- Vendor response time limit for MOVE approval requests.
- Fixed set of cancellation policies (exact terms of flexible, moderate, strict).
- Legal, privacy and terms of service requirements.
- Timeline: overview estimates 6 to 7 months development, 4 to 6 weeks QA, 1 to 2 weeks deployment.
