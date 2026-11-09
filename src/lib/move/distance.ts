import { MOVE_CONFIG } from "./config";

export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** Great-circle distance between two points, in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Estimated road distance and drive time. Replace with routed data later. */
export function estimateRoute(a: LatLng, b: LatLng): { km: number; minutes: number } {
  const km = haversineKm(a, b) * MOVE_CONFIG.roadCircuity;
  return { km, minutes: Math.ceil((km / MOVE_CONFIG.averageKmh) * 60) };
}
