import type { Metadata } from "next";

import { BasicsForm } from "@/components/vibe/basics-tab";
import { VendorPage } from "@/components/vendor/vendor-page";

export const metadata: Metadata = {
  title: "New Vibe listing | YaadGuide",
};

export default function Page(): React.JSX.Element {
  return (
    <VendorPage title="New listing" description="Start with the basics. You add tickets, times, photos and the location next.">
      <BasicsForm />
    </VendorPage>
  );
}
