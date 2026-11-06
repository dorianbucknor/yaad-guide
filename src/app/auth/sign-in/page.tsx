import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { WithNext } from "@/components/auth/with-next";

export const metadata: Metadata = {
  title: "Sign in | YaadGuide",
};

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}): React.JSX.Element {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <WithNext searchParams={searchParams}>
          {(next) => <LoginForm next={next} />}
        </WithNext>
      </Suspense>
    </AuthShell>
  );
}
