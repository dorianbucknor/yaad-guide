import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { VendorSignupForm } from "@/components/auth/vendor-signup-form";

export const metadata: Metadata = {
  title: "Become a vendor | YaadGuide",
};

export default function Page(): React.JSX.Element {
  return (
    <AuthShell>
      <VendorSignupForm />
    </AuthShell>
  );
}
