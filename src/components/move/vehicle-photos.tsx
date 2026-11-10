"use client";

import { CheckCircle2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerVehiclePhotoAction, removeVehiclePhotoAction } from "@/lib/move/actions";
import type { MoveVehicleView } from "@/lib/move/queries";
import { createClient } from "@/lib/supabase/client";

import { useSave } from "./use-save";

const SLOTS = [
  { kind: "front", label: "Front of the vehicle" },
  { kind: "rear", label: "Rear of the vehicle" },
  { kind: "interior", label: "Interior" },
  { kind: "luggage", label: "Luggage space" },
] as const;
const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 5 * 1024 * 1024;

function PhotoSlot({
  vehicleId,
  kind,
  label,
  existingId,
  required,
}: {
  vehicleId: string;
  kind: string;
  label: string;
  existingId?: string;
  required: boolean;
}): React.JSX.Element {
  const { pending, run } = useSave();
  const [busy, setBusy] = useState(false);
  const id = `photo-${vehicleId}-${kind}-${existingId ?? "new"}`;

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const ext = EXTENSIONS[file.type];
    if (!ext) return void toast.error("Use a JPG, PNG or WebP photo.");
    if (file.size > MAX_BYTES) return void toast.error("That photo is over 5 MB.");
    setBusy(true);
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setBusy(false);
      return void toast.error("Please sign in again.");
    }
    const path = `${data.user.id}/${vehicleId}/${kind}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const { error } = await supabase.storage.from("listing-photos").upload(path, file, { contentType: file.type });
    if (error) {
      setBusy(false);
      return void toast.error("We could not upload that photo. Please try again.");
    }
    setBusy(false);
    run(
      async () => {
        // A required slot holds one photo, so the old one goes first.
        if (existingId && kind !== "extra") {
          const removed = await removeVehiclePhotoAction(existingId);
          if (!removed.ok) return removed;
        }
        const result = await registerVehiclePhotoAction({ vehicleId, kind, path });
        if (!result.ok) await supabase.storage.from("listing-photos").remove([path]);
        return result;
      },
      { success: "Photo saved" },
    );
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-base font-medium">
          {label}
        </Label>
        {existingId ? (
          <Badge className="bg-success-subtle text-success-subtle-foreground">
            <CheckCircle2Icon aria-hidden /> Added
          </Badge>
        ) : (
          <Badge variant="outline">{required ? "Needed" : "Optional"}</Badge>
        )}
      </div>
      <Input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy || pending}
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {existingId && kind === "extra" ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          disabled={pending}
          onClick={() => run(() => removeVehiclePhotoAction(existingId), { success: "Photo removed" })}
        >
          Remove photo
        </Button>
      ) : null}
    </div>
  );
}

/** The four photos a listing needs from this vehicle, and any extras. */
export function VehiclePhotos({ vehicle }: { vehicle: MoveVehicleView }): React.JSX.Element {
  const extras = vehicle.photos.filter((p) => p.kind === "extra");
  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-[65ch] text-sm text-muted-foreground">
        JPG, PNG or WebP, up to 5 MB each. Replacing a photo sends the listing for a quick check.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {SLOTS.map(({ kind, label }) => (
          <PhotoSlot
            key={kind}
            vehicleId={vehicle.id}
            kind={kind}
            label={label}
            existingId={vehicle.photos.find((p) => p.kind === kind)?.id}
            required
          />
        ))}
        {extras.map((photo, i) => (
          <PhotoSlot key={photo.id} vehicleId={vehicle.id} kind="extra" label={`Extra photo ${i + 1}`} existingId={photo.id} required={false} />
        ))}
        <PhotoSlot vehicleId={vehicle.id} kind="extra" label="Add another photo" required={false} />
      </div>
    </div>
  );
}
