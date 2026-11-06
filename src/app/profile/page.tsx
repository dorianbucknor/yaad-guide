import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AvatarUpload } from "@/components/auth/avatar-upload";
import { ProfileForm } from "@/components/auth/profile-form";
import { buttonVariants } from "@/components/ui/button";
import { avatarPublicUrl } from "@/lib/auth/avatar";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Your profile | YaadGuide",
};

async function ProfileContent(): Promise<React.JSX.Element> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/auth/sign-in?next=%2Fprofile");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, phone, phone_verified_at, profile_photo_link")
    .eq("id", auth.user.id)
    .maybeSingle();

  const firstName: string = profile?.first_name ?? "";
  const verified = Boolean(profile?.phone_verified_at);
  const phoneLink = "/auth/phone?next=%2Fprofile";

  return (
    <div className="flex flex-col gap-8">
      <AvatarUpload
        userId={auth.user.id}
        photoUrl={avatarPublicUrl(profile?.profile_photo_link, getSupabaseEnv().url)}
        initial={firstName.charAt(0).toUpperCase() || "?"}
      />
      <ProfileForm firstName={firstName} lastName={profile?.last_name ?? ""} />
      <dl className="flex flex-col gap-4 text-sm">
        <div>
          <dt className="font-medium">Email</dt>
          <dd className="text-muted-foreground">{auth.user.email}</dd>
        </div>
        <div>
          <dt className="font-medium">Phone</dt>
          <dd className="flex flex-wrap items-center gap-3 text-muted-foreground">
            <span>
              {profile?.phone ?? "No phone number"}
              {profile?.phone ? (verified ? " (verified)" : " (not verified)") : ""}
            </span>
            <Link href={phoneLink} className={buttonVariants({ variant: "outline", size: "sm" })}>
              {profile?.phone ? "Change number" : "Verify a number"}
            </Link>
          </dd>
        </div>
      </dl>
    </div>
  );
}

export default function Page(): React.JSX.Element {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Your profile</h1>
        <Link href="/" className={buttonVariants({ variant: "ghost" })}>
          Home
        </Link>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <ProfileContent />
      </Suspense>
    </main>
  );
}
