import { DocumentUploader } from "@/components/vendor/document-uploader";
import type { ProfileMode } from "@/lib/vibe/profile-status";
import { recordVibeDocumentAction } from "@/lib/vibe/profile-actions";
import type { VibeOverview } from "@/lib/vibe/types";

/**
 * The documents a Vibe vendor uploads. The ID and business registration are needed to go live;
 * the venue permit and the health permit are optional and earn the Trusted badge once an admin checks them.
 */
export function VibeDocuments({
  overview,
  mode,
  today,
}: {
  overview: VibeOverview;
  mode: ProfileMode;
  today: string;
}): React.JSX.Element {
  const readOnly = mode === "locked";
  const hasProfile = overview.profile !== null;
  const doc = (type: string) => overview.documents.find((d) => d.docType === type);

  return (
    <div className="flex flex-col gap-4">
      <DocumentUploader
        userId={overview.userId}
        docType="government_id"
        label="Government ID"
        current={doc("government_id")}
        readOnly={readOnly}
        today={today}
        record={recordVibeDocumentAction}
      />
      {hasProfile ? (
        <>
          <DocumentUploader
            userId={overview.userId}
            docType="business_registration"
            label="Business registration (certificate or TRN)"
            current={doc("business_registration")}
            readOnly={readOnly}
            today={today}
            record={recordVibeDocumentAction}
          />
          <div className="flex flex-col gap-2">
            <p className="max-w-[65ch] text-sm text-muted-foreground">
              A venue permit is optional. Once an admin checks it, your listings show the Trusted badge.
            </p>
            <DocumentUploader
              userId={overview.userId}
              docType="venue_permit"
              label="Venue permit (optional)"
              current={doc("venue_permit")}
              readOnly={readOnly}
              today={today}
              record={recordVibeDocumentAction}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="max-w-[65ch] text-sm text-muted-foreground">
              For food vendors. Upload a Food Handler&apos;s Permit if you sell street food or run a cookshop, or an Establishment or Health
              Permit if you run a restaurant. Once an admin checks it, your listings earn the Trusted badge.
            </p>
            <DocumentUploader
              userId={overview.userId}
              docType="health_permit"
              label="Health or Food Handler's Permit (optional)"
              current={doc("health_permit")}
              readOnly={readOnly}
              today={today}
              record={recordVibeDocumentAction}
            />
          </div>
        </>
      ) : (
        <p className="max-w-[65ch] text-sm text-muted-foreground">
          Save your business details first, then upload your business registration.
        </p>
      )}
    </div>
  );
}
