# Terms and conditions guide

A running list of clauses to include when the Terms of Service and the Vendor Agreement are drafted. Each entry says where the rule comes from in the product, so the lawyer drafting the documents can see why it is there.

All wording below is a starting point, not legal advice. The PRD already requires a Jamaican lawyer to review the launch documents.

## Vendor: free tickets (Vibe)

**Source:** `docs/superpowers/specs/2026-11-09-vibe-vendor-side-design.md`, section "Free tickets and discounts". The vendor sees the same warning in a confirmation dialog every time they save a free ticket type.

**What the product tells the vendor:**
- A free ticket costs the traveler nothing on YaadGuide, and YaadGuide takes no commission on it.
- The vendor must not charge for a free ticket in any other way: not at the venue, not at the door, and not through extra fees, tips or add-ons that a traveler needs in order to get in.
- A vendor found doing so can be permanently banned.

**Draft clause (for the Vendor Agreement):**

> Free tickets. If you list a ticket as free, you agree that the traveler will not be asked to pay you, or anyone acting for you, anything to receive or use that ticket. This applies on YaadGuide and anywhere else, including at the venue or at the door, and includes any fee, tip, deposit or add-on that is needed for entry or for the experience the ticket describes. If we find that you have charged for a free ticket, we may permanently ban you and every vendor profile you hold, remove your listings, and hold back any payout we owe you while we look into it.

**Points for the lawyer to settle:**
- Whether a permanent ban may be applied automatically or only after the vendor can respond, and what proof YaadGuide needs (a traveler report, a recording, a booking record).
- Whether withholding payouts is allowed and for how long, given the Data Protection Act (2020) and consumer protection rules.
- Whether optional paid extras (food, merchandise, parking) that are clearly separate from entry are allowed, and how the clause should word the difference.
- How a banned vendor can appeal, and whether a ban covers every vendor profile under the same person (the PRD allows up to three).
- Where the time the vendor confirmed the free ticket (`free_confirmed_at`) is kept as evidence, and for how long.
