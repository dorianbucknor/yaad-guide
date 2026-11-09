/** Mirrors the SQL: 90-day window in generate_vibe_slots_for, cutoff default and bounds on vibe_listings. */
export const VIBE_CONFIG = {
  slotWindowDays: 90,
  defaultCutoffMinutes: 60,
  maxCutoffMinutes: 10_080,
  maxPhotos: 10,
  ticketDescriptionMax: 200,
} as const;
