# Design

Source: the founder's early Figma exports (landing page, mobile screens), which show direction and are not final. The web UI does not have to match the mobile screens. Aesthetic constraints below come from the `frontend-design` skill; component and state planning draws on the `ui-ux-pro-max` data. Where they disagree with the brief, the brief wins.

## Direction

- **Subject:** a Jamaican travel marketplace for independent travelers (STAY, MOVE, VIBE) and the local vendors who serve them.
- **Mood:** sunlit and warm, calm and confident. Premium without being cold; Jamaican without being a tourist-brochure cliché. Think a trusted local friend, not a booking engine.
- **The one memorable thing:** the **route line**. A winding hand-drawn path (as in the Figma MOVE, STAY, VIBE section) connects the three pillars and the steps of a trip. It appears in the hero, the pillar section, the itinerary builder's progress, and empty states. Everything around it stays quiet. Do not add other decorative devices.
- **Do not** use: a cream background with a serif headline and clay accent; one identical rounded card repeated everywhere with the same grey shadow; gradient washes as decoration; ALL-CAPS tracked eyebrows above every heading; numbered 01/02/03 markers unless the content is truly a sequence; "→" on every link.

## Tokens

Brand colors (fixed by the founder):

| Name | Hex | Role |
|---|---|---|
| Primary | `#0A7A49` | Brand primary: buttons, links, small text, focus ring (light mode). Replaces the original `#0E9A5D`, which is no longer used |
| Primary dark | `#042E1C` | Body text in light mode; dark mode background |
| Primary light | `#B7E1CE` | Tints, selected states, section canvases |
| Secondary | `#FAC422` | The main call to action; sparing accents |
| Secondary dark | `#443C08` | Text on yellow tints |
| Secondary light | `#F1E48D` | Banners, highlights |

Contrast (computed WCAG ratios):

- `#042E1C` on `#FAC422`: 9.19. On `#B7E1CE`: 10.39. On `#F1E48D`: 11.48. `#443C08` on `#F1E48D`: 8.56. All pass.
- White on `#0A7A49`: 5.39. `#0A7A49` on white: 5.39, on the page background `#F4FAF7`: 5.10. Passes for normal text and UI.
- In dark mode `#0A7A49` is only 2.76 on `#042E1C` and 2.33 on cards. Use it for fills only, never for text or borders on dark surfaces. Dark mode uses the lighter `#4CC38A` for primary buttons.
- `#B7E1CE` on `#0A7A49`: 3.77 (large text only). `#042E1C` on `#0A7A49`: 2.76 (do not use).
- `#FAC422` on white: 1.62. Never use yellow as text or icon color on light backgrounds.

Approved derived tokens:

- Background (light): a faint green-tinted white `#F4FAF7`, not a warm cream. Cards are white.
- Text: `#042E1C`, not black.
- Muted surface `#E3F1EA` with muted text `#46604F` (5.92:1). Divider `#BFDCCB` (decorative only). Input border `#6B9580` (3.37:1 on white; form-field borders need 3:1).
- Focus ring `#0A7A49` (5.10:1) in light mode, `#B7E1CE` (10.39:1) in dark mode.

Where tokens live: `src/app/globals.css`, as shadcn CSS variables in oklch for light (`:root`) and dark (`.dark`). Brand colors are also available as Tailwind colors: `brand`, `brand-light`, `brand-dark`, `sun`, `sun-light`, `sun-dark`. `--brand` and the light-mode `--primary` are both `#0A7A49`; in dark mode `--primary` becomes `#4CC38A` while `--brand` stays `#0A7A49`. `--secondary` is the yellow call to action. Radius base is 12px (`--radius: 0.75rem`).

### Semantic colors

Each has a solid color with a foreground, and a subtle tint with its own text color, for alerts and badges. Always pair with an icon and text, never color alone. Success is deliberately a different green from the brand green.

| Role | Light solid | Light subtle (bg / text) | Dark solid | Dark subtle (bg / text) |
|---|---|---|---|---|
| Success | `#17803D` (white 5.01) | `#E4F4E9` / `#0F5F2C` (6.84) | `#4ADE80` (dark text 8.53) | `#0B3D22` / `#86EFAC` (8.77) |
| Warning | `#B45309` (white 5.02) | `#FEF3C7` / `#7C3A06` (7.65) | `#FB923C` (dark text 6.57) | `#3F2406` / `#FDBA74` (8.49) |
| Info | `#1D6FB8` (white 5.23) | `#E3F0FB` / `#14507F` (7.30) | `#60A5FA` (dark text 5.85) | `#0F2F4F` / `#93C5FD` (7.56) |
| Error | `#C62828` (white 5.62) | `#FDECEA` / `#8E1B1B` (7.91) | `#F87171` (dark text 5.37) | `#4A1414` / `#FCA5A5` (7.90) |

Warning is orange in dark mode so it is never confused with the yellow call to action.

### Dark mode

Deep forest green, never black. Surfaces step lighter as they rise.

| Layer | Hex | Text on it |
|---|---|---|
| Background | `#042E1C` | `#F4FAF7`, 14.06 |
| Card | `#0A3B27` | `#F4FAF7`, 11.91 |
| Popover | `#0D4430` | `#F4FAF7`, 10.53 |
| Muted | `#0F4A32` | `#A8CDB9`, 5.91 |
| Accent | `#14573C` | `#F4FAF7`, 8.08 |
| Sidebar | `#03261A` | `#F4FAF7` |

- Primary button: `#4CC38A` with `#042E1C` text (6.71). Secondary stays `#FAC422` with dark text (9.19).
- Divider `#1F5E45` (decorative). Input border `#5E9A7F` (3.84 on cards, 4.53 on the background).
- All 40 foreground and background pairs above were checked against WCAG AA (4.5:1 text, 3:1 UI).
- Theme is managed by a zustand store (see Implementation notes). Choices are light, dark and system, and the default is system.

## Type

- **Headings:** Bricolage Grotesque, a characterful variable grotesque with warmth. Used large, with tight leading, and not only for one accented word.
- **Body and UI:** Figtree, friendly and highly legible at small sizes.
- Both load through `next/font/google` in `src/app/layout.tsx` and are mapped in `globals.css`: `--font-heading` is Bricolage Grotesque and `--font-sans` is Figtree. `h1` to `h4` use the heading font by default. Pairing confirmed by the founder.
- Geist Mono is loaded for code and token names on the design page.
- Scale (mobile to desktop): body 16px with line-height 1.5, small 14px (never below 12px), headings on a modular scale of about 1.25 to 1.333. Hero headline is the largest element on the page.
- Line length under 75 characters. Sentence case everywhere. No ALL-CAPS labels except the vertical MOVE / STAY / VIBE pillar marks, where the lettering is part of the illustration.
- Numbers (prices, dates) use tabular figures so lists align.

## Spacing and negative space

- 8px base scale (4, 8, 12, 16, 24, 32, 48, 64, 96, 128).
- Generous white space is a core brand trait. One idea per section; on mobile, one primary decision per screen.
- Section padding 64px mobile, 128px desktop. Card padding 20px mobile, 24px desktop. Listing rows have 16px vertical rhythm.
- Content is left-aligned. Centered text only for the hero and short section intros. Max content width 1200px; reading width 65ch.
- Touch targets at least 44 by 44px with 8px spacing. Buttons enforce this: every `Button` size (including `xs`, `sm` and the icon sizes) is 44px tall below the `md` breakpoint (768px), and returns to shadcn's compact sizes (24 to 36px) from `md` up. The same rule is built into the shared form controls, so screens do not have to remember it. Below `md`:
  - Inputs, select triggers, toggles, dropdown items, select options and command items are 44px tall.
  - Tab triggers are 44px (the tab list grows to 50px); accordion triggers are 46px.
  - Calendar day cells are 44 by 44px (`--cell-size` is 44px, and 28px from `md` up).
  - Checkbox, radio and switch keep their small visible size, but their tap area is enlarged to 44px or more (44 by 44 for checkbox and radio, 58 by 46 for the switch). Keep a label next to them, and keep neighbouring controls 8px apart so tap areas do not overlap.
  - Textareas are already taller than 44px.
  - Shadcn components added later need the same treatment; check them with the `/design` page before use.

## Shape and depth

- Radius encodes hierarchy, not one value for everything: controls (inputs, buttons) 12px, cards 20px, large section canvases 40px or more (as in the Figma pillar section), chips full-round.
- Depth comes mainly from color layering and thin borders in primary light. Shadows are rare and soft: only on floating layers (menus, sheets, the sticky booking bar).

## Imagery and iconography

- Real photography of Jamaican places and people is the main visual material; the hero uses a photograph.
- The Figma uses stock isometric clip art for listings and emoji in chips and toggles. Replace emoji with SVG icons (Lucide, which ships with shadcn) and replace placeholder clip art with vendor photos.
- Illustration is limited to the route line and small pillar marks.

## Motion

- One orchestrated moment: the route line draws itself once when the pillar section enters the viewport. No fade-and-slide-up on every section, no hover transitions on every card.
- Motion that answers an action is welcome: sheets opening, a booking confirming, an item added to the itinerary.
- Durations 150 to 300ms for UI, longer only for the route line. Honor `prefers-reduced-motion` by rendering the route line fully drawn.

## Components

Rule: **shadcn/ui is the base for everything.** Install primitives through the shadcn CLI or MCP, restyle through tokens, and build every custom component by composing them. Do not hand-roll a control that shadcn already provides. ### shadcn primitives installed

`button`, `input`, `input-group`, `label`, `field`, `textarea`, `select`, `checkbox`, `radio-group`, `switch`, `toggle`, `toggle-group`, `tabs`, `card`, `badge`, `avatar`, `separator`, `skeleton`, `dialog`, `sheet`, `drawer`, `popover`, `dropdown-menu`, `command`, `calendar`, `sonner` (toasts), `tooltip`, `table`, `pagination`, `progress`, `alert`, `accordion`, `breadcrumb`, `navigation-menu`, `slider`, `carousel`, `scroll-area`, `sidebar`.

- shadcn no longer ships `form`. Forms use `field` with react-hook-form and zod. TODO(bootstrap): those two libraries are not installed yet.
- The Base UI based shadcn style is in use (`base-nova`). Triggers take a `render` prop, not `asChild` (for example `<TooltipTrigger render={<Button />}>`).
- `TooltipProvider` and `Toaster` are mounted once in `src/components/providers.tsx`. Show toasts with `toast.success("Booked")` from `sonner`. Use the same word as the button that caused the action. Typed toasts (`success`, `info`, `warning`, `error`) use the semantic tokens: subtle tint background, subtle text color, solid-color border, and a type icon, in both light and dark mode. The mapping lives in `src/components/ui/sonner.tsx` (`richColors` plus the `--success-*`, `--info-*`, `--warning-*` and `--error-*` variables; `error` uses the `destructive` tokens). A plain `toast("...")` stays neutral.
- Tooltips are supplementary: never put essential information only in a tooltip, since touch users cannot hover.

### Custom components (composed from the primitives)

| Component | Built from | Notes |
|---|---|---|
| `SiteHeader` / `BottomTabBar` | navigation-menu, button, sheet | Header on desktop; four-tab bar on mobile (home, itinerary, search, profile) |
| `PillarCard` | card, button | STAY, MOVE, VIBE entry points |
| `RouteLine` | custom SVG | The signature element; respects reduced motion |
| `PlanningRail` | card, toggle-group, select, calendar | The left-to-right planning steps from the landing page, without v1-excluded steps (no flights, cruise, car rental, packages) |
| `ListingRow` / `ListingCard` | card, badge, avatar | Photo, name, type tag, trusted badge, rating, price, location |
| `TrustedBadge` | badge | Shown only for admin-approved vendors; icon plus text |
| `SponsoredLabel` | badge | Always visible on sponsored listings |
| `RatingStars` | custom, accessible | Read-only and input variants |
| `ReviewList` | card, separator | Verified-booking reviews, and a separately labeled imported-reviews section with source and link |
| `FilterBar` | input, command, popover, sheet | Search, area, date, price, category; sheet on mobile |
| `PriceBreakdown` | table | Listed price, planning fee, total, in USD |
| `AvailabilityCalendar` | calendar, popover | Blocks unavailable nights and sold-out slots |
| `RoomTypePicker` | radio-group, card | STAY room types |
| `TicketSelector` | button, input | VIBE capacity per slot |
| `DriverRequestForm` | form, select, calendar | MOVE request, with an accept-or-decline status |
| `ItineraryBuilder` / `ItineraryDay` | card, accordion, sheet | Day-by-day, free to build, checkout at the end |
| `CheckoutStepper` | progress, form | Review, details, pay |
| `CancellationPolicyNote` | alert, accordion | Shown before paying |
| `VendorDashboardShell` | sidebar, tabs, table | Listings, calendar, bookings, verification status |
| `DocumentUpload` | input, progress, alert | Verification documents |
| `VerificationStatus` | badge, alert | Unverified, pending, approved, rejected |
| `ContactReveal` | card, button | Vendor phone and email, shown only after confirmation |
| `EmptyState` | card, button | Always names the next action |

## States

Every data-driven component defines these states before it is built:

- **Loading:** skeletons shaped like the final content, with reserved space (layout shift under 0.1). Buttons show a spinner and disable during submit.
- **Empty:** one plain sentence and one action, for example "No stays match these filters. Clear filters." Use the route line, not a sad illustration.
- **Error:** says what went wrong and how to fix it, next to the field or section, announced with `role="alert"`. Never color alone. No apologies.
- **Success:** a confirmation using the same word as the button ("Booked", "Published", "Saved").
- **Disabled:** reduced contrast but still legible; explain why (for example "Select a date").
- **Interactive:** visible focus ring on every control (never removed), hover only as an enhancement, pressed state, selected state for chips, toggles and calendar days.

Domain-specific states:

- **Listing:** draft, published, sponsored, sold out, unavailable.
- **Vendor:** unverified (drafts only), pending, approved, rejected.
- **Booking:** requested (MOVE), awaiting vendor response, confirmed, completed, cancelled, refunded.
- **Payment:** processing, paid, failed with retry, refunded in part.
- **Imported review source:** loading, unavailable (the section hides without breaking the page).

## Copy

- Plain verbs and sentence case. A button names what happens: "Plan my trip", "Request driver", "Book stay", "Pay $240". An action keeps the same name through the flow.
- Name things in the traveler's words (stay, ride, things to do), not system words.
- Prices always show "USD" context once per page and use `p/n` only where space is tight.

## Accessibility

- WCAG AA: 4.5:1 for normal text, 3:1 for large text and UI components, checked in light and dark mode. See the contrast notes under Tokens.
- Visible focus on every interactive element; full keyboard use; labels on every input (no placeholder-only); icon-only buttons have accessible names.
- Errors and confirmations announced to screen readers.
- Respect `prefers-reduced-motion`. Responsive at 375, 768, 1024 and 1440px with no horizontal scroll.
- Do not use color as the only signal (trusted, sponsored, error, availability).

## Implementation notes

- **Design page:** `/design` (`src/app/design/`) shows the brand colors, surfaces, semantic colors, type specimens and base components, with a Light, Dark and System toggle. Open it after any token or font change. It is a development reference, not a product page. TODO(bootstrap): decide whether to hide it in production. Its hex values are typed in by hand and must be kept in step with `globals.css` and this file.
- **Theme:** `src/stores/theme-store.ts` is a zustand store holding the preference (`light`, `dark`, `system`) and the resolved theme. The preference is saved in `localStorage` under `yg-theme`. `initTheme()` runs once from `Providers`, sets the `.dark` class and `color-scheme` on `<html>`, and follows the operating system when set to `system`. An inline script in `layout.tsx` applies the saved theme before first paint to avoid a flash. `next-themes` was removed. Components that need the theme read `useThemeStore`; `sonner.tsx` does this.
- **Form controls section:** `/design` also shows an input, select, checkbox, radio group, switch, toggle, tabs, dropdown, accordion and calendar. Use it to measure sizes at 390px and desktop widths.
- **Dates and the calendar:** anything that reads the current date (the shadcn `Calendar`, date pickers) fails Next's prerender under Cache Components if it renders on the server. Render it on the client only, with the `useIsClient` pattern in `src/app/design/controls-demo.tsx`, and reserve its height so the page does not jump. Only a production build (`npm run build`) shows this; the dev server does not.
- **Combined test:** the "Test tooltip and toast" button on `/design` shows a tooltip on hover or focus and a toast on click.
- **Brand primary:** the founder set `#0A7A49` as brand primary, replacing the original `#0E9A5D`.

## Open items

- Two lint errors remain in shadcn-generated files (`src/components/ui/carousel.tsx` and `src/hooks/use-mobile.ts`); deferred by the founder.
- Components not yet used or measured for the 44px rule: slider, carousel controls, pagination, navigation menu, breadcrumb links, sidebar items, and the dialog, sheet and drawer close buttons.
- The `/design` page was checked in Chrome: desktop width in light and dark mode, and a 390px wide view where all 16 buttons measure 44px with no horizontal scroll. Tooltip and toast were checked on desktop only (hover and click). The System theme option and touch behavior were not checked.
- Two lint errors in shadcn-generated files: `src/components/ui/carousel.tsx` and `src/hooks/use-mobile.ts` (setState inside an effect).
- Logo asset and final photography.
