import {
  LuCalendarDays,
  LuCarFront,
  LuClipboardCheck,
  LuFileCheck,
  LuFlag,
  LuHouse,
  LuInbox,
  LuListChecks,
  LuMapPin,
  LuSettings,
  LuUsers,
} from "react-icons/lu";

/** One icon set for the dashboards: Lucide, through react-icons. */
export const SHELL_ICONS = {
  home: LuHouse,
  inbox: LuInbox,
  calendar: LuCalendarDays,
  listing: LuClipboardCheck,
  vehicle: LuCarFront,
  documents: LuFileCheck,
  queue: LuListChecks,
  vendors: LuUsers,
  flags: LuFlag,
  places: LuMapPin,
  settings: LuSettings,
} as const;

export type ShellIcon = keyof typeof SHELL_ICONS;
