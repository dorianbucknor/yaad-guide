export const DOC_TYPES = [
  "government_id",
  "jtb_license",
  "insurance",
  "fitness",
  "business_registration",
  "venue_permit",
  "health_permit",
] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png"] as const;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

const EXTENSION: Record<(typeof ALLOWED_MIME)[number], string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export function needsExpiry(type: DocType): boolean {
  return (
    type !== "government_id" &&
    type !== "business_registration" &&
    type !== "venue_permit" &&
    type !== "health_permit"
  );
}

export function needsVehicle(type: DocType): boolean {
  return type === "insurance" || type === "fitness";
}

/** A message when the file cannot be uploaded, otherwise null. */
export function validateFile(file: { type: string; size: number }): string | null {
  if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) {
    return "Upload a PDF, JPG or PNG file.";
  }
  if (file.size > MAX_FILE_BYTES) return "The file must be 5 MB or smaller.";
  return null;
}

/** `yyyy-MM-dd` strings: expired when the expiry is before today. */
export function isExpired(expiresOn: string, today: string): boolean {
  return expiresOn < today;
}

export function documentPath(accountId: string, documentId: string, mime: string): string {
  const extension = EXTENSION[mime as keyof typeof EXTENSION] ?? "bin";
  return `${accountId}/${documentId}.${extension}`;
}

/** True only for `<accountId>/<file>` with no further segments or dot segments. */
export function isOwnDocumentPath(path: string, accountId: string): boolean {
  const parts = path.split("/");
  return (
    parts.length === 2 &&
    parts[0] === accountId &&
    parts[1].length > 0 &&
    parts[1] !== "." &&
    parts[1] !== ".."
  );
}
