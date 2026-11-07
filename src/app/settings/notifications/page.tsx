import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PreferencesTable } from "@/components/settings/preferences-table";
import { SettingsSection, SettingsSkeleton } from "@/components/settings/section";
import { resolvePreferences } from "@/lib/settings/notifications";
import { getSettingsOverview } from "@/lib/settings/queries";

async function NotificationsContent(): Promise<React.JSX.Element> {
  const overview = await getSettingsOverview();
  if (!overview) redirect("/auth/sign-in?next=%2Fsettings%2Fnotifications");

  return (
    <SettingsSection
      title="Notifications"
      description="Choose how we reach you. Changes save as you switch."
    >
      <PreferencesTable
        entries={resolvePreferences(overview.preferences, overview.role)}
        phoneVerified={overview.phoneVerified}
      />
    </SettingsSection>
  );
}

export default function Page(): React.JSX.Element {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <NotificationsContent />
    </Suspense>
  );
}
