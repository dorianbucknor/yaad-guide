import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DeleteAccount } from "@/components/settings/delete-account";
import { EmailForm } from "@/components/settings/email-form";
import { PasswordForm } from "@/components/settings/password-form";
import { SettingsSection, SettingsSkeleton } from "@/components/settings/section";
import { SignInMethods } from "@/components/settings/sign-in-methods";
import { SignOutOthers } from "@/components/settings/sign-out-others";
import { getSettingsOverview } from "@/lib/settings/queries";
import { securityState } from "@/lib/settings/security-state";

async function SecurityContent(): Promise<React.JSX.Element> {
  const overview = await getSettingsOverview();
  if (!overview) redirect("/auth/sign-in?next=%2Fsettings%2Fsecurity");
  const state = securityState(overview);

  return (
    <div className="flex flex-col gap-8">
      <SettingsSection title="How you sign in">
        <SignInMethods methods={state.methods} />
      </SettingsSection>
      <SettingsSection
        title={state.showCurrentPassword ? "Change password" : "Set a password"}
        description={
          state.showCurrentPassword
            ? "Changing it signs you out on your other devices."
            : "You sign in with Google now. A password lets you sign in with your email too."
        }
      >
        <PasswordForm showCurrentPassword={state.showCurrentPassword} />
      </SettingsSection>
      <SettingsSection title="Email" description="We send a link to the new address to confirm it.">
        <EmailForm email={overview.email} pendingEmail={state.pendingEmail} />
      </SettingsSection>
      <SettingsSection title="Devices" description="Keep this device and sign out everywhere else.">
        <div>
          <SignOutOthers />
        </div>
      </SettingsSection>
      <SettingsSection title="Delete account">
        <DeleteAccount hasPassword={overview.hasPassword} />
      </SettingsSection>
    </div>
  );
}

export default function Page(): React.JSX.Element {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SecurityContent />
    </Suspense>
  );
}
