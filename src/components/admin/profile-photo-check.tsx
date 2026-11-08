"use client";

import { CheckCircle2Icon } from "lucide-react";

import { useSave } from "@/components/move/use-save";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { verifyProfilePhotoAction } from "@/lib/move/admin-actions";

/** Admin check that the profile photo shows the driver. */
export function ProfilePhotoCheck({
  profileId,
  photoUrl,
  verified,
}: {
  profileId: string;
  photoUrl: string | null;
  verified: boolean;
}): React.JSX.Element {
  const { pending, run } = useSave();
  return (
    <section aria-labelledby="photo-heading" className="flex flex-col gap-3">
      <h2 id="photo-heading" className="text-xl font-semibold">
        Profile photo
      </h2>
      {photoUrl ? (
        // A plain img: the file lives on the Supabase host, which next/image is not set up for.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="The vendor's profile photo" className="size-40 rounded-2xl border border-border object-cover" />
      ) : (
        <p className="text-muted-foreground">No profile photo yet.</p>
      )}
      {verified ? (
        <Badge className="self-start bg-success-subtle text-success-subtle-foreground">
          <CheckCircle2Icon aria-hidden /> Checked: shows the driver
        </Badge>
      ) : (
        <Button
          type="button"
          className="self-start"
          disabled={pending || !photoUrl}
          onClick={() => run(() => verifyProfilePhotoAction(profileId), { success: "Photo confirmed" })}
        >
          This photo shows the driver
        </Button>
      )}
    </section>
  );
}
