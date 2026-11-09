import { describe, expect, it } from "vitest";

import { decideAccess, type Decision, type Viewer } from "./guard";

const guest: Viewer = { signedIn: false, role: "traveler", phoneVerified: false, archived: false };
const traveler: Viewer = { signedIn: true, role: "traveler", phoneVerified: false, archived: false };
const verifiedTraveler: Viewer = { ...traveler, phoneVerified: true };
const vendor: Viewer = { signedIn: true, role: "vendor", phoneVerified: true, archived: false };
const admin: Viewer = { signedIn: true, role: "admin", phoneVerified: true, archived: false };
const archivedTraveler: Viewer = { ...traveler, archived: true };

const allow: Decision = { type: "allow" };
const forbidden: Decision = { type: "forbidden" };
const redirect = (to: string): Decision => ({ type: "redirect", to });

type Row = [string, Viewer, string | undefined, Decision];

const rows: Row[] = [
  ["/profile", guest, undefined, redirect("/auth/sign-in?next=%2Fprofile")],
  ["/profile", traveler, undefined, allow],
  ["/plan/checkout", guest, undefined, redirect("/auth/sign-in?next=%2Fplan%2Fcheckout")],
  ["/plan/checkout", traveler, undefined, redirect("/auth/phone?next=%2Fplan%2Fcheckout")],
  ["/plan/checkout", verifiedTraveler, undefined, allow],
  ["/v", traveler, undefined, forbidden],
  ["/v", vendor, undefined, allow],
  ["/v/listings", admin, undefined, allow],
  ["/v/anything", guest, undefined, redirect("/auth/sign-in?next=%2Fv%2Fanything")],
  ["/admin", vendor, undefined, forbidden],
  ["/admin/users", admin, undefined, allow],
  ["/admin", guest, undefined, redirect("/auth/sign-in?next=%2Fadmin")],
  ["/auth/sign-in", traveler, "?next=/plan", redirect("/plan")],
  ["/auth/sign-in", traveler, "?next=//evil.com", redirect("/")],
  ["/auth/sign-up", traveler, undefined, redirect("/")],
  ["/auth/sign-in", vendor, undefined, redirect("/v")],
  ["/auth/sign-in", admin, undefined, redirect("/admin")],
  ["/auth/sign-in", vendor, "?next=/plan", redirect("/plan")],
  ["/auth/reset-password", traveler, undefined, allow],
  ["/auth/confirm", traveler, undefined, allow],
  ["/auth/success", traveler, "?kind=confirmed", allow],
  ["/auth/success", vendor, "?kind=signed-in", allow],
  ["/auth/success", guest, undefined, redirect("/auth/sign-in?next=%2Fauth%2Fsuccess")],
  ["/auth/callback", traveler, undefined, allow],
  ["/auth/phone", traveler, undefined, allow],
  ["/auth/forbidden", traveler, undefined, allow],
  ["/auth/error", traveler, undefined, allow],
  ["/auth/vendor/complete", traveler, undefined, allow],
  ["/auth/phone", guest, "?next=/v", redirect("/auth/sign-in?next=%2Fauth%2Fphone%3Fnext%3D%2Fv")],
  ["/auth/vendor/complete", guest, undefined, redirect("/auth/sign-in?next=%2Fauth%2Fvendor%2Fcomplete")],
  ["/auth/sign-in", guest, undefined, allow],
  ["/auth/vendor", guest, undefined, allow],
  ["/", guest, undefined, allow],
  ["/plan", guest, undefined, allow],
  ["/profiles-of-note", guest, undefined, allow],
  ["/%76", traveler, undefined, forbidden],
  ["/%61dmin/users", vendor, undefined, forbidden],
  ["/%61dmin", guest, undefined, redirect("/auth/sign-in?next=%2Fadmin")],
  ["//v", traveler, undefined, forbidden],
  ["/v/", traveler, undefined, forbidden],
  ["/pro%66ile", guest, undefined, redirect("/auth/sign-in?next=%2Fprofile")],
  ["/%E0%A4%A", guest, undefined, allow],
  ["/", archivedTraveler, undefined, redirect("/auth/restore")],
  ["/settings/security", archivedTraveler, undefined, redirect("/auth/restore")],
  ["/plan", archivedTraveler, undefined, redirect("/auth/restore")],
  ["/auth/sign-in", archivedTraveler, undefined, redirect("/auth/restore")],
  ["/%76", archivedTraveler, undefined, redirect("/auth/restore")],
  ["//settings", archivedTraveler, undefined, redirect("/auth/restore")],
  ["/auth/archived", archivedTraveler, undefined, redirect("/auth/restore")],
  ["/auth/restore", archivedTraveler, undefined, allow],
  ["/auth/restore", guest, undefined, redirect("/auth/sign-in?next=%2Fauth%2Frestore")],
  ["/auth/restore", traveler, undefined, allow],
  ["/auth/archived", guest, undefined, allow],
  ["/auth/archived", traveler, undefined, allow],
  ["/settings", guest, undefined, redirect("/auth/sign-in?next=%2Fsettings")],
  ["/settings/security", guest, undefined, redirect("/auth/sign-in?next=%2Fsettings%2Fsecurity")],
  ["/settings/security", traveler, undefined, allow],
];

describe("decideAccess", () => {
  it.each(rows)("%s as %j (search %s)", (pathname, viewer, search, expected) => {
    expect(decideAccess(pathname, viewer, search)).toEqual(expected);
  });
});
