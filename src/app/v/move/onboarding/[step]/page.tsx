import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { BusinessForm } from "@/components/vendor/business-form";
import { DocumentUploader } from "@/components/vendor/document-uploader";
import { SubmitPanel } from "@/components/vendor/submit-panel";
import { VehicleForm } from "@/components/vendor/vehicle-form";
import { VehicleList } from "@/components/vendor/vehicle-list";
import { VendorPage } from "@/components/vendor/vendor-page";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/skeleton";
import { profileMode, type StepKey } from "@/lib/vendor/checklist";
import { getVendorOverview } from "@/lib/vendor/queries";

const STEPS: Record<StepKey, { title: string; description: string }> = {
  business: {
    title: "Business details",
    description: "Tell travelers who you are and where you mostly work.",
  },
  vehicles: {
    title: "Vehicles",
    description: "Add each vehicle you own. You drive one at a time, and you can switch later.",
  },
  documents: {
    title: "Documents",
    description: "Upload each document with its expiry date. An admin checks them before you go live.",
  },
  review: {
    title: "Submit for review",
    description: "Check that everything is in, then send your profile to an admin.",
  },
};

export const metadata: Metadata = {
  title: "Set up your vendor profile | YaadGuide",
};

export function generateStaticParams(): { step: StepKey }[] {
  return (Object.keys(STEPS) as StepKey[]).map((step) => ({ step }));
}

function NeedBusiness(): React.JSX.Element {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-muted-foreground">Save your business details first, then come back to this step.</p>
      <Link href="/v/move/onboarding/business" className={buttonVariants({ variant: "outline" })}>
        Business details
      </Link>
    </div>
  );
}

async function StepBody({ params }: { params: Promise<{ step: string }> }): Promise<React.JSX.Element> {
  const { step } = await params;
  if (!(step in STEPS)) notFound();
  const key = step as StepKey;

  const overview = await getVendorOverview();
  if (!overview) redirect(`/auth/sign-in?next=${encodeURIComponent(`/v/move/onboarding/${key}`)}`);

  const profile = overview.profile;
  const mode = profileMode(overview);
  const today = new Date().toISOString().slice(0, 10);

  if (key === "business") {
    return (
      <BusinessForm
        businessName={profile?.businessName ?? ""}
        primaryRegion={profile?.primaryRegion ?? ""}
        readOnly={mode !== "edit"}
        nextHref="/v/move/onboarding/vehicles"
      />
    );
  }

  if (!profile) return <NeedBusiness />;

  if (key === "vehicles") {
    return (
      <div className="flex flex-col gap-10">
        <VehicleList vehicles={overview.vehicles} mode={mode} />
        {mode === "locked" ? null : (
          <section aria-labelledby="add-vehicle" className="flex flex-col gap-4">
            <h2 id="add-vehicle" className="text-xl font-semibold">
              Add a vehicle
            </h2>
            <VehicleForm />
          </section>
        )}
        <div>
          <Link href="/v/move/onboarding/documents" className={buttonVariants({ variant: "outline" })}>
            Continue to documents
          </Link>
        </div>
      </div>
    );
  }

  if (key === "documents") {
    const docFor = (docType: string, vehicleId: string | null) =>
      overview.documents.find((d) => d.docType === docType && d.vehicleId === vehicleId);
    const readOnly = mode === "locked";

    return (
      <div className="flex flex-col gap-6">
        <DocumentUploader
          userId={overview.userId}
          docType="government_id"
          label="Government ID"
          current={docFor("government_id", null)}
          readOnly={readOnly}
          today={today}
        />
        <DocumentUploader
          userId={overview.userId}
          docType="jtb_license"
          label="JTB license"
          current={docFor("jtb_license", null)}
          readOnly={readOnly}
          today={today}
        />
        {overview.vehicles.length === 0 ? (
          <p className="text-muted-foreground">Add a vehicle first to upload its certificates.</p>
        ) : (
          overview.vehicles.map((vehicle) => (
            <section key={vehicle.id} aria-label={`${vehicle.make} ${vehicle.model} certificates`} className="flex flex-col gap-6">
              <DocumentUploader
                userId={overview.userId}
                docType="insurance"
                vehicleId={vehicle.id}
                label={`Insurance certificate, ${vehicle.plate}`}
                current={docFor("insurance", vehicle.id)}
                readOnly={readOnly}
                today={today}
              />
              <DocumentUploader
                userId={overview.userId}
                docType="fitness"
                vehicleId={vehicle.id}
                label={`Fitness certificate, ${vehicle.plate}`}
                current={docFor("fitness", vehicle.id)}
                readOnly={readOnly}
                today={today}
              />
            </section>
          ))
        )}
        <div>
          <Link href="/v/move/onboarding/review" className={buttonVariants({ variant: "outline" })}>
            Continue to review
          </Link>
        </div>
      </div>
    );
  }

  return (
    <SubmitPanel
      ready={overview.readiness.ready}
      missing={overview.readiness.missing}
      locked={mode === "locked" || profile.status === "approved"}
    />
  );
}

async function StepContent({ params }: { params: Promise<{ step: string }> }): Promise<React.JSX.Element> {
  const { step } = await params;
  if (!(step in STEPS)) notFound();
  const { title, description } = STEPS[step as StepKey];

  return (
    <section aria-labelledby="step-title" className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 id="step-title" className="text-2xl font-semibold">
          {title}
        </h2>
        <p className="max-w-[65ch] text-muted-foreground">{description}</p>
      </div>
      <StepBody params={params} />
    </section>
  );
}

export default function Page({ params }: { params: Promise<{ step: string }> }): React.JSX.Element {
  return (
    <VendorPage title="Set up your profile" description="Each step saves as you go.">
      <Suspense
        fallback={
          <div className="flex flex-col gap-4" aria-busy="true">
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-40 rounded-xl" />
          </div>
        }
      >
        <StepContent params={params} />
      </Suspense>
    </VendorPage>
  );
}
