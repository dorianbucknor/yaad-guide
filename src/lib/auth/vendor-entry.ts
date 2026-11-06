/** Where "Become a vendor" leads: guests sign up; signed-in users upgrade in place. */
export function vendorEntryHref(signedIn: boolean): string {
  return signedIn ? "/auth/vendor/complete" : "/auth/vendor";
}
