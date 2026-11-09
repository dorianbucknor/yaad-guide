"use client";

import { CheckCircle2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useSave } from "@/components/move/use-save";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { recordPhotoAction, removePhotoAction, setCoverPhotoAction } from "@/lib/vibe/actions";
import { VIBE_CONFIG } from "@/lib/vibe/config";
import type { VibeListingView } from "@/lib/vibe/types";

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 5 * 1024 * 1024;

/** The cover photo shows first on the listing; the rest make a gallery. Order follows upload order. */
export function PhotosTab({ listing }: { listing: VibeListingView }): React.JSX.Element {
  const router = useRouter();
  const { pending, run } = useSave();
  const [busy, setBusy] = useState(false);
  const supabase = createClient();
  const full = listing.photos.length >= VIBE_CONFIG.maxPhotos;

  const upload = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0) return;
    const room = VIBE_CONFIG.maxPhotos - listing.photos.length;
    const chosen = Array.from(files).slice(0, room);
    if (files.length > room) toast.info(`Only ${room} more photo${room === 1 ? "" : "s"} fit. The rest were skipped.`);

    setBusy(true);
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setBusy(false);
      toast.error("Please sign in again.");
      return;
    }
    let added = 0;
    for (const file of chosen) {
      const ext = EXTENSIONS[file.type];
      if (!ext) {
        toast.error(`${file.name}: use a JPG, PNG or WebP photo.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is over 5 MB.`);
        continue;
      }
      const path = `${data.user.id}/vibe/${listing.id}/${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error } = await supabase.storage.from("listing-photos").upload(path, file, { contentType: file.type });
      if (error) {
        toast.error(`We could not upload ${file.name}. Please try again.`);
        continue;
      }
      const result = await recordPhotoAction({ listingId: listing.id, path });
      if (!result.ok) {
        await supabase.storage.from("listing-photos").remove([path]);
        toast.error(result.error);
        continue;
      }
      added += 1;
    }
    setBusy(false);
    if (added > 0) {
      toast.success(added === 1 ? "Photo added" : `${added} photos added`);
      router.refresh();
    }
  };

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <section aria-labelledby="photos-heading" className="flex flex-col gap-4">
        <h2 id="photos-heading" className="text-xl font-semibold">
          Photos
        </h2>
        <p className="max-w-[65ch] text-sm text-muted-foreground">
          Add a cover photo and up to {VIBE_CONFIG.maxPhotos - 1} more. JPG, PNG or WebP, up to 5 MB each. The first photo you add becomes the
          cover. Changing photos on a live listing sends it for a quick check.
        </p>
        <Field>
          <FieldLabel htmlFor="photo-files">Add photos</FieldLabel>
          <Input
            id="photo-files"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            disabled={busy || pending || full}
            onChange={(event) => {
              void upload(event.target.files);
              event.target.value = "";
            }}
          />
          <FieldDescription>
            {listing.photos.length} of {VIBE_CONFIG.maxPhotos} used{full ? ". Remove one to add another." : "."}
          </FieldDescription>
        </Field>
      </section>

      {listing.photos.length === 0 ? (
        <p className="text-muted-foreground">No photos yet. A cover photo is needed before you can send the listing for review.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {listing.photos.map((photo, index) => {
            const url = supabase.storage.from("listing-photos").getPublicUrl(photo.storagePath).data.publicUrl;
            return (
              <li key={photo.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- a user-uploaded file from storage, sized by CSS */}
                <img
                  src={url}
                  alt={photo.isCover ? `Cover photo of ${listing.title}` : `Photo ${index + 1} of ${listing.title}`}
                  className="aspect-video w-full rounded-xl object-cover"
                />
                <div className="flex flex-wrap items-center gap-2">
                  {photo.isCover ? (
                    <Badge className="bg-success-subtle text-success-subtle-foreground">
                      <CheckCircle2Icon aria-hidden /> Cover
                    </Badge>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending || busy}
                      onClick={() => run(() => setCoverPhotoAction(photo.id), { success: "Cover changed" })}
                    >
                      Make cover
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending || busy}
                    onClick={() => run(() => removePhotoAction(photo.id), { success: "Photo removed" })}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
