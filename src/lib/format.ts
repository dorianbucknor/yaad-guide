import { format, isValid, parse } from "date-fns";

/** "14:30" as "2:30 PM" in local time; malformed input is returned unchanged. */
export function formatTime12h(hhmm: string): string {
  const parsed = parse(hhmm, "HH:mm", new Date(2000, 0, 1));
  return isValid(parsed) ? format(parsed, "h:mm a") : hhmm;
}
