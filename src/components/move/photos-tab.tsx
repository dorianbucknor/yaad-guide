"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { applyFailure } from "@/components/auth/apply-failure";
import { TextField } from "@/components/auth/text-field";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerVehiclePhotoAction, removeVehiclePhotoAction, saveLuggageAction } from "@/lib/move/actions";
import type { MoveListingView } from "@/lib/move/queries";
import { luggageSchema } from "@/lib/schemas/move";
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

const luggageForm = luggageSchema.pick({ large: true, carryOn: true });

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
  const id = `photo-${kind}-${existingId ?? "new"}`;

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
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
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

export function PhotosTab({ view }: { view: MoveListingView }): React.JSX.Element {
  const { pending, run } = useSave();
  const vehicle = view.vehicle;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(luggageForm),
    defaultValues: { large: vehicle?.luggageLarge ?? 0, carryOn: vehicle?.luggageCarryOn ?? 0 },
  });

  if (!vehicle) {
    return (
      <p className="text-muted-foreground">
        Add and activate a vehicle first.{" "}
        <Link href="/vendor" className="underline underline-offset-4">
          Go to vendor home
        </Link>
      </p>
    );
  }

  const save = handleSubmit((values) =>
    run(() => saveLuggageAction({ vehicleId: vehicle.id, ...values }), {
      success: "Luggage space saved",
      onFail: (result) => applyFailure(result, setError),
    }),
  );
  const profileOk = Boolean(view.profile.photoVerifiedAt) && Boolean(view.profilePhotoLink);
  const extras = vehicle.photos.filter((p) => p.kind === "extra");

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4" aria-labelledby="luggage-heading">
        <h2 id="luggage-heading" className="text-lg font-semibold">
          Luggage space — {vehicle.label}
        </h2>
        <form onSubmit={save} noValidate className="flex flex-col gap-4">
          <TextField
            id="luggage-large"
            label="Large bags that fit"
            type="number"
            inputMode="numeric"
            min="0"
            max="20"
            error={errors.large?.message}
            {...register("large", { valueAsNumber: true })}
          />
          <TextField
            id="luggage-carry-on"
            label="Carry-on bags that fit"
            type="number"
            inputMode="numeric"
            min="0"
            max="20"
            error={errors.carryOn?.message}
            {...register("carryOn", { valueAsNumber: true })}
          />
          <Button type="submit" className="self-start" disabled={pending}>
            {pending ? "Saving…" : "Save luggage space"}
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="photos-heading">
        <h2 id="photos-heading" className="text-lg font-semibold">
          Vehicle photos
        </h2>
        <p className="max-w-[65ch] text-sm text-muted-foreground">JPG, PNG or WebP, up to 5 MB each. Replacing a photo sends the listing for a quick check.</p>
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
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="profile-photo-heading">
        <h2 id="profile-photo-heading" className="text-lg font-semibold">
          Your profile photo
        </h2>
        <p className="text-sm text-muted-foreground">
          {profileOk ? "Your profile photo has been checked." : "Travelers see your face. Add a clear photo; an admin checks it."}
        </p>
        <Link href="/profile" className={buttonVariants({ variant: "outline" }) + " self-start"}>
          {view.profilePhotoLink ? "Change profile photo" : "Add profile photo"}
        </Link>
      </section>
    </div>
  );
}
