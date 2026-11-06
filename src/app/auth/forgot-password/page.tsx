import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password | YaadGuide",
};

export default function Page(): React.JSX.Element {
  return (
    <AuthShell>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
