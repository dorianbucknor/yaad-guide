import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AvatarUpload } from "@/components/auth/avatar-upload";
import { ProfileForm } from "@/components/auth/profile-form";
import { SettingsSection, SettingsSkeleton } from "@/components/settings/section";
import { buttonVariants } from "@/components/ui/button";
import { avatarPublicUrl } from "@/lib/auth/avatar";
import { getSettingsOverview } from "@/lib/settings/queries";
import { getSupabaseEnv } from "@/lib/supabase/env";

async function PersonalContent(): Promise<React.JSX.Element> {
  const overview = await getSettingsOverview();
  if (!overview) redirect("/auth/sign-in?next=%2Fsettings%2Fpersonal");

  return (
    <div className="flex flex-col gap-8">
      <SettingsSection title="Personal info" description="Your name and photo, as other people see them.">
        <AvatarUpload
          userId={overview.userId}
          photoUrl={avatarPublicUrl(overview.photoLink, getSupabaseEnv().url)}
          initial={overview.firstName.charAt(0).toUpperCase() || "?"}
        />
        <ProfileForm
          firstName={overview.firstName}
          lastName={overview.lastName}
          phoneMissing={!overview.phone}
        />
      </SettingsSection>
      <SettingsSection title="Contact" description="Used for sign-in and booking messages.">
        <dl className="flex flex-col gap-4 text-sm">
          <div>
            <dt className="font-medium">Email</dt>
            <dd className="text-muted-foreground">{overview.email}</dd>
          </div>
          <div>
            <dt className="font-medium">Phone</dt>
            <dd className="flex flex-wrap items-center gap-3 text-muted-foreground">
              <span>
                {overview.phone ?? "No phone number"}
                {overview.phone ? (overview.phoneVerified ? " (verified)" : " (not verified)") : ""}
              </span>
              <Link
                href="/auth/phone?next=%2Fsettings%2Fpersonal"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {overview.phone ? "Change number" : "Verify a number"}
              </Link>
            </dd>
          </div>
        </dl>
      </SettingsSection>
    </div>
  );
}

export default function Page(): React.JSX.Element {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <PersonalContent />
    </Suspense>
  );
}
