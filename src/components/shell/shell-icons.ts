import {
  LuBedDouble,
  LuBell,
  LuShieldCheck,
  LuIdCard,
  LuPartyPopper,
  LuBriefcaseBusiness,
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
  business: LuBriefcaseBusiness,
  stay: LuBedDouble,
  vibe: LuPartyPopper,
  profile: LuIdCard,
  documents: LuFileCheck,
  queue: LuListChecks,
  vendors: LuUsers,
  flags: LuFlag,
  places: LuMapPin,
  settings: LuSettings,
  security: LuShieldCheck,
  notifications: LuBell,
} as const;

export type ShellIcon = keyof typeof SHELL_ICONS;
