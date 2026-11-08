import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PlacesAdmin } from "@/components/admin/places-admin";
import { VendorPage } from "@/components/vendor/vendor-page";
import { Skeleton } from "@/components/ui/skeleton";
import { getPlacesAdmin } from "@/lib/move/admin-queries";

export const metadata: Metadata = {
  title: "Places | YaadGuide",
};

async function Places(): Promise<React.JSX.Element> {
  const data = await getPlacesAdmin();
  if (!data) redirect("/auth/forbidden");
  return <PlacesAdmin places={data.places} suggestions={data.suggestions} />;
}

export default function Page(): React.JSX.Element {
  return (
    <VendorPage title="Places" description="The pickup and drop-off places vendors can serve." backHref="/admin/vendors" backLabel="Vendor review" wide>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" aria-busy="true" />}>
        <Places />
      </Suspense>
    </VendorPage>
  );
}
