import { isExpired, type DocType } from "./documents";

export type ReadinessInput = {
  vehicles: { id: string; isActive: boolean }[];
  documents: { docType: DocType; vehicleId: string | null; expiresOn: string | null }[];
  today: string;
};

/** What a MOVE profile still needs before it can be submitted. */
export function checkReadiness(input: ReadinessInput): { ready: boolean; missing: string[] } {
  const { vehicles, documents, today } = input;
  const missing: string[] = [];

  const find = (docType: DocType, vehicleId: string | null) =>
    documents.find((d) => d.docType === docType && d.vehicleId === vehicleId);
  const usable = (docType: DocType, vehicleId: string | null): "ok" | "missing" | "expired" => {
    const doc = find(docType, vehicleId);
    if (!doc) return "missing";
    if (doc.expiresOn && isExpired(doc.expiresOn, today)) return "expired";
    return "ok";
  };

  if (usable("government_id", null) === "missing") missing.push("Government ID");

  const license = usable("jtb_license", null);
  if (license === "missing") missing.push("JTB license");
  if (license === "expired") missing.push("JTB license (expired)");

  if (vehicles.length === 0) missing.push("A vehicle");
  else if (!vehicles.some((v) => v.isActive)) missing.push("An active vehicle");

  for (const vehicle of vehicles) {
    for (const [type, label] of [
      ["insurance", "Insurance certificate"],
      ["fitness", "Fitness certificate"],
    ] as const) {
      const state = usable(type, vehicle.id);
      if (state === "missing") missing.push(`${label} for vehicle ${vehicle.id}`);
      if (state === "expired") missing.push(`${label} for vehicle ${vehicle.id} (expired)`);
    }
  }

  return { ready: missing.length === 0, missing };
}
