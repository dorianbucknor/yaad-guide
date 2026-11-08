import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { DocumentRow } from "@/components/admin/document-row";
import { ProfilePhotoCheck } from "@/components/admin/profile-photo-check";
import { ReviewPanel } from "@/components/admin/review-panel";
import { StatusBanner } from "@/components/vendor/status-banner";
import { VendorPage } from "@/components/vendor/vendor-page";
import { Skeleton } from "@/components/ui/skeleton";
import { avatarPublicUrl } from "@/lib/auth/avatar";
import { getAdminProfile } from "@/lib/vendor/admin-queries";

export const metadata: Metadata = {
  title: "Review a vendor | YaadGuide",
};

const DOC_LABEL = {
  government_id: "Government ID",
  jtb_license: "JTB license",
  insurance: "Insurance certificate",
  fitness: "Fitness certificate",
} as const;

async function Detail({ params }: { params: Promise<{ id: string }> }): Promise<React.JSX.Element> {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const profile = await getAdminProfile(id);
  if (!profile) redirect("/auth/forbidden");
  const today = new Date().toISOString().slice(0, 10);
  const plateOf = (vehicleId: string | null) =>
    profile.vehicles.find((v) => v.id === vehicleId)?.plate;

  return (
    <div className="flex flex-col gap-10">
      <StatusBanner status={profile.status} note={profile.reviewNote} />

      <section aria-labelledby="who-heading" className="flex flex-col gap-3">
        <h2 id="who-heading" className="text-xl font-semibold">
          Vendor
        </h2>
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium">Name</dt>
            <dd className="text-muted-foreground">{profile.owner.name}</dd>
          </div>
          <div>
            <dt className="font-medium">Phone</dt>
            <dd className="text-muted-foreground tabular-nums">{profile.owner.phone ?? "Not verified"}</dd>
          </div>
          <div>
            <dt className="font-medium">Business</dt>
            <dd className="text-muted-foreground">{profile.businessName || "Not set"}</dd>
          </div>
          <div>
            <dt className="font-medium">Primary region</dt>
            <dd className="text-muted-foreground">{profile.primaryRegion}</dd>
          </div>
        </dl>
      </section>

      <ProfilePhotoCheck
        profileId={profile.id}
        photoUrl={avatarPublicUrl(profile.profilePhotoPath, process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")}
        verified={Boolean(profile.photoVerifiedAt)}
      />

      <section aria-labelledby="vehicles-heading" className="flex flex-col gap-3">
        <h2 id="vehicles-heading" className="text-xl font-semibold">
          Vehicles
        </h2>
        {profile.vehicles.length === 0 ? (
          <p className="text-muted-foreground">No vehicles.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
            {profile.vehicles.map((v) => (
              <li key={v.id} className="flex flex-col gap-1 p-4">
                <span className="font-medium">
                  {v.make} {v.model}
                  {v.isActive ? " (driving now)" : ""}
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {v.plate} · {v.vehicleType} · {v.year} · {v.passengerCapacity} passengers
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="docs-heading" className="flex flex-col gap-3">
        <h2 id="docs-heading" className="text-xl font-semibold">
          Documents
        </h2>
        {profile.documents.length === 0 ? (
          <p className="text-muted-foreground">No documents uploaded.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
            {profile.documents.map((d) => (
              <DocumentRow
                key={d.id}
                documentId={d.id}
                label={`${DOC_LABEL[d.docType]}${plateOf(d.vehicleId) ? `, ${plateOf(d.vehicleId)}` : ""}`}
                expiresOn={d.expiresOn}
                verified={d.verified}
                today={today}
              />
            ))}
          </ul>
        )}
      </section>

      <ReviewPanel
        profileId={profile.id}
        accountId={profile.accountId}
        pendingReview={profile.status === "pending"}
      />
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }): React.JSX.Element {
  return (
    <VendorPage
      title="Review a vendor"
      backHref="/admin/vendors"
      backLabel="Vendor review"
      wide
    >
      <Suspense
        fallback={
          <div className="flex flex-col gap-4" aria-busy="true">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        }
      >
        <Detail params={params} />
      </Suspense>
    </VendorPage>
  );
}
