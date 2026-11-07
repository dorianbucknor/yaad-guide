import type { Role } from "@/lib/auth/guard";

export const NOTIFICATION_CATEGORIES = [
  "account_security",
  "bookings",
  "vendor_review",
  "document_expiry",
  "offers",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const CHANNELS = ["email", "sms"] as const;
export type Channel = (typeof CHANNELS)[number];

export const CATEGORY_LABELS: Record<NotificationCategory, { label: string; description: string }> = {
  account_security: {
    label: "Account and security",
    description: "Sign-in alerts, password and email changes.",
  },
  bookings: {
    label: "Bookings",
    description: "Confirmations, changes and reminders for your trips.",
  },
  vendor_review: {
    label: "Vendor review",
    description: "Updates on your vendor application and vehicle transfers.",
  },
  document_expiry: {
    label: "Document expiry",
    description: "Reminders before a license, insurance or fitness certificate expires.",
  },
  offers: {
    label: "Offers and news",
    description: "Deals and product updates from YaadGuide.",
  },
};

const VENDOR_ONLY: readonly NotificationCategory[] = ["vendor_review", "document_expiry"];

export function defaultEnabled(category: NotificationCategory, _channel: Channel): boolean {
  return category !== "offers";
}

export function isLocked(category: NotificationCategory, channel: Channel): boolean {
  return category === "account_security" && channel === "email";
}

export function visibleCategories(role: Role): NotificationCategory[] {
  return NOTIFICATION_CATEGORIES.filter(
    (category) => role !== "traveler" || !VENDOR_ONLY.includes(category),
  );
}

export function resolvePreferences(
  rows: { category: string; channel: string; enabled: boolean }[],
  role: Role,
): { category: NotificationCategory; channel: Channel; enabled: boolean; locked: boolean }[] {
  return visibleCategories(role).flatMap((category) =>
    CHANNELS.map((channel) => {
      const locked = isLocked(category, channel);
      const stored = rows.find((r) => r.category === category && r.channel === channel);
      const enabled = locked ? true : (stored?.enabled ?? defaultEnabled(category, channel));
      return { category, channel, enabled, locked };
    }),
  );
}
