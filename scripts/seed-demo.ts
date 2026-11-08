// Fills the LOCAL Docker Supabase with demo MOVE vendors, listings and requests.
// Run: npm run seed:demo   (refuses any non-local Supabase URL or NODE_ENV=production)
import { execSync } from "node:child_process";

import { faker } from "@faker-js/faker";
import { createClient } from "@supabase/supabase-js";

import { assertLocalSupabase } from "./seed-guard";

const DEMO_DOMAIN = "@example.test";
const PASSWORD = "demo-password-1";
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function localEnv(): { url: string; key: string } {
  const out = execSync("supabase status -o env", { encoding: "utf8" });
  const get = (name: string) => out.match(new RegExp(`^${name}="?([^"\\r\\n]+)"?`, "m"))?.[1];
  const url = get("API_URL");
  const key = get("SERVICE_ROLE_KEY");
  assertLocalSupabase(url, process.env.NODE_ENV);
  if (!key) throw new Error("Could not read the local service key from `supabase status -o env`.");
  return { url: url as string, key };
}

const { url, key } = localEnv();
const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

function must<T>(result: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (result.error || result.data === null || result.data === undefined) {
    throw new Error(`${what}: ${result.error?.message ?? "no data"}`);
  }
  return result.data as NonNullable<T>;
}

async function clearDemoUsers() {
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Listing users: ${error.message}`);
    for (const user of data.users) {
      if (user.email?.endsWith(DEMO_DOMAIN)) {
        const { error: delError } = await db.auth.admin.deleteUser(user.id);
        if (delError) throw new Error(`Deleting ${user.email}: ${delError.message}`);
      }
    }
    if (data.users.length < 200) break;
  }
}

async function createUser(first: string, last: string, role: "vendor" | "traveler", n: number) {
  const email = `${role}${n}${DEMO_DOMAIN}`;
  const created = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { first_name: first, last_name: last },
  });
  if (created.error || !created.data.user) throw new Error(`Creating ${email}: ${created.error?.message}`);
  const id = created.data.user.id;
  must(await db.from("profiles").update({ role, first_name: first, last_name: last }).eq("id", id).select("id"), "profile");
  return { id, email };
}

const pick = <T>(items: readonly T[]): T => items[faker.number.int({ min: 0, max: items.length - 1 })];

type Vendor = {
  profileId: string;
  listingId: string;
  seats: number;
  large: number;
  carryOn: number;
  currency: "usd" | "jmd";
  status: string;
};

async function main() {
  faker.seed(42);
  await clearDemoUsers();

  const places = must(await db.from("places").select("id, slug, kind").eq("active", true), "places");
  if (places.length < 8) throw new Error("Run `supabase migration up` first: places are missing.");
  const airports = places.filter((p) => p.kind === "airport");

  const travelers = [];
  for (let i = 1; i <= 8; i++) {
    travelers.push(await createUser(faker.person.firstName(), faker.person.lastName(), "traveler", i));
  }

  const vehicleTypes = [
    { type: "Sedan", seats: 4, large: 3, carryOn: 3 },
    { type: "SUV", seats: 6, large: 5, carryOn: 4 },
    { type: "Minivan", seats: 9, large: 8, carryOn: 6 },
    { type: "Bus", seats: 24, large: 20, carryOn: 20 },
  ] as const;
  const regions = ["St. James", "Westmoreland", "St. Ann", "Kingston", "Portland", "Trelawny"];
  // Live and busy first, then the other listing states, one paused.
  const states = ["live", "live", "live", "in_review", "draft", "live"] as const;

  const vendors: Vendor[] = [];

  for (let i = 0; i < states.length; i++) {
    const first = faker.person.firstName();
    const last = faker.person.lastName();
    const user = await createUser(first, last, "vendor", i + 1);
    const profile = must(
      await db
        .from("vendor_profiles")
        .insert({
          account_id: user.id,
          category: "move",
          business_name: `${last} Transfers`,
          primary_region: regions[i % regions.length],
          status: "approved",
          reviewed_at: new Date().toISOString(),
          photo_verified_at: new Date().toISOString(),
        })
        .select("id")
        .single(),
      "vendor profile",
    );
    const v = vehicleTypes[i % vehicleTypes.length];
    const vehicle = must(
      await db
        .from("vendor_vehicles")
        .insert({
          vendor_profile_id: profile.id,
          vehicle_type: v.type,
          make: faker.vehicle.manufacturer(),
          model: faker.vehicle.model(),
          year: faker.number.int({ min: 2015, max: 2025 }),
          plate: `D${i}${faker.string.alphanumeric({ length: 5, casing: "upper" })}`,
          passenger_capacity: v.seats,
          is_active: true,
          luggage_large: v.large,
          luggage_carry_on: v.carryOn,
        })
        .select("id")
        .single(),
      "vehicle",
    );
    // Placeholder rows only; there are no files behind these paths.
    must(
      await db
        .from("vehicle_photos")
        .insert(
          (["front", "rear", "interior", "luggage"] as const).map((kind, position) => ({
            vehicle_id: vehicle.id,
            kind,
            position,
            storage_path: `${user.id}/${vehicle.id}/${kind}.jpg`,
          })),
        )
        .select("id"),
      "photos",
    );

    const currency = i % 3 === 2 ? "jmd" : "usd";
    const scale = currency === "jmd" ? 150 : 1;
    const status = states[i];
    const listing = must(
      await db
        .from("move_listings")
        .insert({
          vendor_profile_id: profile.id,
          currency,
          island_wide: false,
          base_fare: 10 * scale,
          per_km: Number((1.2 * scale).toFixed(2)),
          hourly_rate: 25 * scale,
          description: faker.lorem.sentences(2).slice(0, 300),
          status,
          approved_at: status === "live" ? new Date().toISOString() : null,
          paused: i === 5,
        })
        .select("id")
        .single(),
      "listing",
    );

    const covered = faker.helpers.arrayElements(places, { min: 5, max: 9 });
    for (const a of airports) if (!covered.includes(a)) covered.push(a);
    must(
      await db
        .from("move_listing_places")
        .insert(covered.map((p) => ({ listing_id: listing.id, place_id: p.id })))
        .select("listing_id"),
      "coverage",
    );
    const rates = [];
    for (let k = 0; k + 1 < Math.min(covered.length, 6); k += 2) {
      const [a, b] = [covered[k].id, covered[k + 1].id].sort();
      rates.push({
        listing_id: listing.id,
        place_a_id: a,
        place_b_id: b,
        price: faker.number.int({ min: 30, max: 120 }) * scale,
      });
    }
    must(await db.from("move_flat_rates").insert(rates).select("id"), "flat rates");
    must(
      await db
        .from("move_availability_rules")
        .insert([1, 2, 3, 4, 5, 6].map((weekday) => ({ listing_id: listing.id, weekday, start_minutes: 360, end_minutes: 1320 })))
        .select("id"),
      "windows",
    );
    const blockStart = Date.now() + faker.number.int({ min: 3, max: 20 }) * DAY;
    must(
      await db
        .from("move_blocked_ranges")
        .insert({
          listing_id: listing.id,
          starts_at: new Date(blockStart).toISOString(),
          ends_at: new Date(blockStart + 2 * DAY).toISOString(),
          note: "Family event",
        })
        .select("id"),
      "blocked range",
    );

    vendors.push({
      profileId: profile.id,
      listingId: listing.id,
      seats: v.seats,
      large: v.large,
      carryOn: v.carryOn,
      currency,
      status,
    });
  }

  // Requests only for live listings, spread over 90 days across every status.
  const now = Date.now();
  const rows: Record<string, unknown>[] = [];
  const taken = new Map<string, Set<number>>();
  const live = vendors.filter((v) => v.status === "live");

  for (const vendor of live) {
    const total = vendor === live[0] ? faker.number.int({ min: 40, max: 55 }) : faker.number.int({ min: 6, max: 18 });
    const slots = new Set<number>();
    taken.set(vendor.profileId, slots);
    for (let n = 0; n < total; n++) {
      const [pickup, dropoff] = faker.helpers.arrayElements(places, 2);
      const pending = n < 3 && vendor === live[0];
      const createdAt = pending
        ? now - faker.number.int({ min: 1, max: 10 }) * HOUR
        : now - faker.number.int({ min: 2, max: 89 }) * DAY - faker.number.int({ min: 0, max: 20 }) * HOUR;
      // Pending rows have near deadlines so the inbox shows urgency.
      const respondBy = pending
        ? now + faker.number.int({ min: 20, max: 180 }) * 60_000
        : createdAt + faker.number.int({ min: 4, max: 24 }) * HOUR;
      let slot = Math.floor((createdAt + faker.number.int({ min: 2, max: 14 }) * DAY) / (3 * HOUR));
      while (slots.has(slot)) slot += 1;
      const pickupAt = pending ? now + faker.number.int({ min: 2, max: 6 }) * DAY : slot * 3 * HOUR;

      let status: string;
      let respondedAt: number | null = null;
      if (pending) {
        status = "pending";
      } else {
        const roll = faker.number.float();
        if (roll < 0.15) status = "expired";
        else if (roll < 0.3) status = "declined";
        else if (roll < 0.35) status = "cancelled";
        else status = pickupAt < now ? "completed" : "accepted";
        if (status !== "expired") {
          // Most answers land in time; some are late so the response rate is not perfect.
          respondedAt =
            faker.number.float() < 0.85
              ? createdAt + (respondBy - createdAt) * faker.number.float({ min: 0.05, max: 0.95 })
              : respondBy + faker.number.int({ min: 1, max: 6 }) * HOUR;
        }
      }
      if (status === "accepted" || status === "completed") slots.add(slot);

      const party = faker.number.int({ min: 1, max: vendor.seats });
      rows.push({
        listing_id: vendor.listingId,
        vendor_profile_id: vendor.profileId,
        traveler_id: pick(travelers).id,
        traveler_first_name: faker.person.firstName(),
        pickup_place_id: pickup.id,
        dropoff_place_id: dropoff.id,
        pickup_at: new Date(pickupAt).toISOString(),
        trip_minutes: faker.number.int({ min: 30, max: 180 }),
        party_size: party,
        bags_large: faker.number.int({ min: 0, max: Math.min(vendor.large, party) }),
        bags_carry_on: faker.number.int({ min: 0, max: Math.min(vendor.carryOn, party) }),
        quoted_amount: faker.number.int({ min: 30, max: 160 }) * (vendor.currency === "jmd" ? 150 : 1),
        quoted_currency: vendor.currency,
        quote_source: faker.number.float() < 0.5 ? "flat" : "formula",
        status,
        respond_by: new Date(respondBy).toISOString(),
        responded_at: respondedAt ? new Date(respondedAt).toISOString() : null,
        decline_reason: status === "declined" ? pick(["dates_blocked", "too_far", "vehicle_unavailable", "other"]) : null,
        vendor_note: status === "accepted" && faker.number.float() < 0.4 ? "Driver will meet you at arrivals." : null,
        created_at: new Date(createdAt).toISOString(),
      });
    }
  }
  must(await db.from("move_requests").insert(rows).select("id"), "requests");

  console.log(`Seeded ${vendors.length} vendors and ${rows.length} requests.`);
  console.log(`Sign in as vendor1${DEMO_DOMAIN} (busiest) to vendor6${DEMO_DOMAIN}. Password: ${PASSWORD}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
