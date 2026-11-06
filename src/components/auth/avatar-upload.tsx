"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { updateProfilePhotoAction } from "@/lib/auth/profile-actions";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 2 * 1024 * 1024;
const EXTENSIONS: Record<string, "webp" | "jpg" | "png"> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};
const ALL_EXTENSIONS = ["webp", "jpg", "png"] as const;

export function AvatarUpload({
  userId,
  photoUrl,
  initial,
}: {
  userId: string;
  photoUrl: string | null;
  initial: string;
}): React.JSX.Element {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [version, setVersion] = useState(0);
  const [pending, startTransition] = useTransition();
  const src = photoUrl ? `${photoUrl}?v=${version}` : null;

  const upload = (file: File): void => {
    const extension = EXTENSIONS[file.type];
    if (!extension) {
      toast.error("Use a WebP, JPEG or PNG image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("The image must be 2 MB or smaller.");
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const path = `${userId}/avatar.${extension}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) {
        toast.error("We could not upload that photo. Please try again.");
        return;
      }
      // Drop a previous photo stored under a different extension.
      const stale = ALL_EXTENSIONS.filter((e) => e !== extension).map(
        (e) => `${userId}/avatar.${e}`,
      );
      await supabase.storage.from("avatars").remove(stale);

      const result = await updateProfilePhotoAction(path);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setVersion((v) => v + 1);
      router.refresh();
    });
  };

  const remove = (): void => {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.storage
        .from("avatars")
        .remove(ALL_EXTENSIONS.map((e) => `${userId}/avatar.${e}`));
      const result = await updateProfilePhotoAction(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar size="lg">
        {src ? <AvatarImage src={src} alt="Your profile photo" /> : null}
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>
      <div className="flex flex-wrap gap-2">
        <input
          ref={input}
          type="file"
          accept="image/webp,image/jpeg,image/png"
          className="sr-only"
          aria-label="Choose a profile photo"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) upload(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => input.current?.click()}
        >
          {pending ? "Working…" : photoUrl ? "Change photo" : "Add photo"}
        </Button>
        {photoUrl ? (
          <Button type="button" variant="ghost" disabled={pending} onClick={remove}>
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}
