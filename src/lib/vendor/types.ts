import type { DocType } from "./documents";

export type VendorStatus = "draft" | "pending" | "approved" | "rejected";
export type TransferStatus =
  | "requested"
  | "owner_agreed"
  | "owner_declined"
  | "approved"
  | "rejected";

export type VendorProfile = {
  id: string;
  businessName: string | null;
  primaryRegion: string;
  status: VendorStatus;
  reviewNote: string | null;
  submittedAt: string | null;
};

export type VendorVehicle = {
  id: string;
  vehicleType: string;
  make: string;
  model: string;
  year: number;
  plate: string;
  passengerCapacity: number;
  isActive: boolean;
};

export type VendorDocument = {
  id: string;
  docType: DocType;
  vehicleId: string | null;
  expiresOn: string | null;
  verified: boolean;
  storagePath: string;
};

export type VendorTransfer = {
  id: string;
  status: TransferStatus;
  vehicleId: string;
  plate: string;
  label: string;
  /** incoming: someone asks for a vehicle I own; outgoing: I asked for theirs. */
  direction: "incoming" | "outgoing";
};

export type VendorOverview = {
  userId: string;
  profile: VendorProfile | null;
  vehicles: VendorVehicle[];
  documents: VendorDocument[];
  transfers: VendorTransfer[];
  hasGovernmentId: boolean;
  readiness: { ready: boolean; missing: string[] };
};
