import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { DocumentRow } from "@/components/admin/document-row";
import { ProfilePhotoCheck } from "@/components/admin/profile-photo-check";
import { ReviewPanel } from "@/components/admin/review-panel";
import { avatarPublicUrl } from "@/lib/auth/avatar";
import { getAdminProfile } from "@/lib/vendor/admin-queries";

const DOC_LABEL = {
  government_id: "Government ID",
  jtb_license: "JTB license",
  insurance: "Insurance certificate",
  fitness: "Fitness certificate",
  business_registration: "Business registration",
  venue_permit: "Venue permit",
  health_permit: "Health permit",
} as const;

/** Everything an admin needs to review one vendor profile; used on its own page and in the queue panel. */
export async function VendorReviewDetail({ id }: { id: string }): Promise<React.JSX.Element> {
  if (!z.uuid().safeParse(id).success) notFound();

  const profile = await getAdminProfile(id);
  if (!profile) redirect("/auth/forbidden");
  const today = new Date().toISOString().slice(0, 10);
  const plateOf = (vehicleId: string | null) => profile.vehicles.find((v) => v.id === vehicleId)?.plate;

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="who-heading" className="flex flex-col gap-3">
        <h2 id="who-heading" className="text-lg font-semibold">
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
            <dt className="font-medium">Category</dt>
            <dd className="text-muted-foreground">{profile.category.toUpperCase()}</dd>
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

      {profile.category === "move" ? (
        <section aria-labelledby="vehicles-heading" className="flex flex-col gap-3">
          <h2 id="vehicles-heading" className="text-lg font-semibold">
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
      ) : null}

      <section aria-labelledby="docs-heading" className="flex flex-col gap-3">
        <h2 id="docs-heading" className="text-lg font-semibold">
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

      <ReviewPanel profileId={profile.id} accountId={profile.accountId} pendingReview={profile.status === "pending"} />
    </div>
  );
}
