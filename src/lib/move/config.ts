/** MOVE settings that are configuration, not logic. Change values here only. */
export const MOVE_CONFIG = {
  /** Time kept free on each side of an accepted trip. */
  tripBufferMinutes: 30,
  /** Road distance is estimated as straight-line distance times this. */
  roadCircuity: 1.4,
  /** Average driving speed used to estimate trip minutes. */
  averageKmh: 45,
  /** Rolling window for the response rate and status overview. */
  responseRateDays: 90,
  /** Fewer requests than this gives no response rate. */
  responseRateMinRequests: 5,
  /** Longest a vendor has to answer a request. */
  maxResponseHours: 24,
  /** Never give a vendor less than this to answer. */
  minResponseHours: 1,
  /** A pickup must be at least this far away to request. */
  minLeadHours: 2,
  /** Time zone of all weekly windows (Jamaica has no daylight saving). */
  timeZone: "America/Jamaica",
} as const;
