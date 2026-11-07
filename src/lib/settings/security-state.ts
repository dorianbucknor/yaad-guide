import type { SettingsOverview } from "./queries";

const PROVIDER_LABELS: Record<string, string> = {
  email: "Email and password",
  google: "Google",
  phone: "Phone",
};

export type SecurityState = {
  showCurrentPassword: boolean;
  methods: string[];
  pendingEmail: string | null;
};

/** What the Security page needs to decide which fields and lists to show. */
export function securityState(
  overview: Pick<SettingsOverview, "providers" | "hasPassword" | "pendingEmail">,
): SecurityState {
  return {
    showCurrentPassword: overview.hasPassword,
    methods: overview.providers.map(
      (provider) => PROVIDER_LABELS[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1),
    ),
    pendingEmail: overview.pendingEmail,
  };
}
