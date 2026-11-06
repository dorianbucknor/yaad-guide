import type { DocType } from "./documents";
import { checkReadiness } from "./readiness";
import type {
  TransferStatus,
  VendorOverview,
  VendorStatus,
} from "./types";

export type RawOverview = {
  userId: string;
  profile: {
    id: string;
    business_name: string | null;
    primary_region: string;
    status: VendorStatus;
    review_note: string | null;
    submitted_at: string | null;
  } | null;
  vehicles: {
    id: string;
    vehicle_type: string;
    make: string;
    model: string;
    year: number;
    plate: string;
    passenger_capacity: number;
    is_active: boolean;
  }[];
  documents: {
    id: string;
    doc_type: DocType;
    vehicle_id: string | null;
    expires_on: string | null;
    verified: boolean;
    storage_path: string;
  }[];
  transfers: {
    id: string;
    status: TransferStatus;
    vehicle_id: string;
    requested_by: string;
    vendor_vehicles: { plate: string; make: string; model: string } | null;
  }[];
};

/** Maps database rows to the shape the vendor screens use. */
export function buildOverview(raw: RawOverview, today: string): VendorOverview {
  const vehicles = raw.vehicles.map((v) => ({
    id: v.id,
    vehicleType: v.vehicle_type,
    make: v.make,
    model: v.model,
    year: v.year,
    plate: v.plate,
    passengerCapacity: v.passenger_capacity,
    isActive: v.is_active,
  }));
  const documents = raw.documents.map((d) => ({
    id: d.id,
    docType: d.doc_type,
    vehicleId: d.vehicle_id,
    expiresOn: d.expires_on,
    verified: d.verified,
    storagePath: d.storage_path,
  }));

  return {
    userId: raw.userId,
    profile: raw.profile && {
      id: raw.profile.id,
      businessName: raw.profile.business_name,
      primaryRegion: raw.profile.primary_region,
      status: raw.profile.status,
      reviewNote: raw.profile.review_note,
      submittedAt: raw.profile.submitted_at,
    },
    vehicles,
    documents,
    transfers: raw.transfers.map((t) => ({
      id: t.id,
      status: t.status,
      vehicleId: t.vehicle_id,
      plate: t.vendor_vehicles?.plate ?? "",
      label: t.vendor_vehicles
        ? `${t.vendor_vehicles.make} ${t.vendor_vehicles.model}`
        : "Vehicle",
      direction: t.requested_by === raw.userId ? ("outgoing" as const) : ("incoming" as const),
    })),
    hasGovernmentId: documents.some((d) => d.docType === "government_id"),
    readiness: checkReadiness({
      vehicles: vehicles.map((v) => ({ id: v.id, isActive: v.isActive })),
      documents: documents.map((d) => ({
        docType: d.docType,
        vehicleId: d.vehicleId,
        expiresOn: d.expiresOn,
      })),
      today,
    }),
  };
}
