"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { recordDocumentAction } from "@/lib/vendor/actions";
import {
  documentPath,
  needsExpiry,
  validateFile,
  type DocType,
} from "@/lib/vendor/documents";
import type { VendorDocument } from "@/lib/vendor/types";

/** One document slot: shows what is on file and uploads a new or replacement file. */
export function DocumentUploader({
  userId,
  docType,
  vehicleId,
  label,
  current,
  readOnly,
  today,
}: {
  userId: string;
  docType: DocType;
  vehicleId?: string;
  label: string;
  current?: VendorDocument;
  readOnly: boolean;
  today: string;
}): React.JSX.Element {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [expiresOn, setExpiresOn] = useState(current?.expiresOn ?? "");
  const [fileError, setFileError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const expiryNeeded = needsExpiry(docType);
  const expired = Boolean(current?.expiresOn && current.expiresOn < today);
  const id = `${docType}-${vehicleId ?? "account"}`;

  const choose = (chosen: File | null): void => {
    setFileError(chosen ? validateFile(chosen) : null);
    setFile(chosen);
  };

  const upload = (): void => {
    if (!file) return;
    const problem = validateFile(file);
    if (problem) {
      setFileError(problem);
      return;
    }
    startTransition(async () => {
      const path = documentPath(userId, crypto.randomUUID(), file.type);
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("vendor-documents")
        .upload(path, file, { contentType: file.type });
      if (error) {
        toast.error("We could not upload that file. Please try again.");
        return;
      }
      const result = await recordDocumentAction({
        docType,
        vehicleId,
        expiresOn: expiryNeeded ? expiresOn : undefined,
        path,
      });
      if (!result.ok) {
        await supabase.storage.from("vendor-documents").remove([path]);
        toast.error(result.error);
        return;
      }
      toast.success("Uploaded");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      router.refresh();
    });
  };

  const canUpload = Boolean(file) && !fileError && (!expiryNeeded || expiresOn !== "");

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-medium">{label}</h3>
        {current ? (
          expired ? (
            <Badge variant="destructive">Expired</Badge>
          ) : current.verified ? (
            <Badge className="bg-success-subtle text-success-subtle-foreground">Verified</Badge>
          ) : (
            <Badge variant="outline">On file, not checked yet</Badge>
          )
        ) : (
          <Badge variant="outline">Missing</Badge>
        )}
      </div>
      {current?.expiresOn ? (
        <p className="text-sm text-muted-foreground tabular-nums">
          Expires {current.expiresOn}
          {expired ? ". Upload a current one." : ""}
        </p>
      ) : null}
      {readOnly ? null : (
        <div className="flex flex-col gap-4">
          {expiryNeeded ? (
            <Field>
              <FieldLabel htmlFor={`${id}-expiry`}>Expiry date</FieldLabel>
              <Input
                id={`${id}-expiry`}
                type="date"
                value={expiresOn}
                onChange={(event) => setExpiresOn(event.target.value)}
              />
            </Field>
          ) : null}
          <Field data-invalid={fileError ? true : undefined}>
            <FieldLabel htmlFor={`${id}-file`}>{current ? "Replace the file" : "File"}</FieldLabel>
            <Input
              id={`${id}-file`}
              ref={fileInput}
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              aria-invalid={fileError ? true : undefined}
              aria-describedby={`${id}-hint`}
              onChange={(event) => choose(event.target.files?.[0] ?? null)}
            />
            <FieldDescription id={`${id}-hint`} role={fileError ? "alert" : undefined}>
              {fileError ?? "PDF, JPG or PNG, up to 5 MB."}
            </FieldDescription>
          </Field>
          <div>
            <Button type="button" variant="outline" disabled={pending || !canUpload} onClick={upload}>
              {pending ? "Uploading…" : "Upload"}
            </Button>
            {!canUpload && !pending ? (
              <span className="ml-3 text-sm text-muted-foreground">
                {expiryNeeded && expiresOn === "" ? "Enter the expiry date and choose a file." : "Choose a file."}
              </span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
