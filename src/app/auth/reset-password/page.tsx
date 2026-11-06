import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Set a new password | YaadGuide",
};

export default function Page(): React.JSX.Element {
  return (
    <AuthShell>
      <ResetPasswordForm />
    </AuthShell>
  );
}
