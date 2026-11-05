import type { Metadata } from "next";

import { ControlsDemo } from "./controls-demo";
import { ButtonDemo, ToastDemo, TooltipDemo, TooltipToastTest } from "./demos";
import { ThemeToggle } from "./theme-toggle";

export const metadata: Metadata = {
  title: "Design tokens | YaadGuide",
};

type Swatch = {
  name: string;
  token: string;
  light: string;
  dark: string;
  /** Token for text drawn on top of the swatch. */
  on?: string;
};

// Hex values mirror src/app/globals.css and DESIGN.md. Update all three together.
const BRAND: Swatch[] = [
  { name: "Primary", token: "brand", light: "#0A7A49", dark: "#0A7A49", on: "#FFFFFF" },
  { name: "Primary dark", token: "brand-dark", light: "#042E1C", dark: "#042E1C", on: "brand-light" },
  { name: "Primary light", token: "brand-light", light: "#B7E1CE", dark: "#B7E1CE", on: "brand-dark" },
  { name: "Secondary", token: "sun", light: "#FAC422", dark: "#FAC422", on: "brand-dark" },
  { name: "Secondary dark", token: "sun-dark", light: "#443C08", dark: "#443C08", on: "sun-light" },
  { name: "Secondary light", token: "sun-light", light: "#F1E48D", dark: "#F1E48D", on: "sun-dark" },
];

const CORE: Swatch[] = [
  { name: "Background", token: "background", light: "#F4FAF7", dark: "#042E1C", on: "foreground" },
  { name: "Card", token: "card", light: "#FFFFFF", dark: "#0A3B27", on: "card-foreground" },
  { name: "Popover", token: "popover", light: "#FFFFFF", dark: "#0D4430", on: "popover-foreground" },
  { name: "Primary (buttons)", token: "primary", light: "#0A7A49", dark: "#4CC38A", on: "primary-foreground" },
  { name: "Secondary (call to action)", token: "secondary", light: "#FAC422", dark: "#FAC422", on: "secondary-foreground" },
  { name: "Muted", token: "muted", light: "#E3F1EA", dark: "#0F4A32", on: "muted-foreground" },
  { name: "Accent", token: "accent", light: "#B7E1CE", dark: "#14573C", on: "accent-foreground" },
  { name: "Border", token: "border", light: "#BFDCCB", dark: "#1F5E45" },
  { name: "Input border", token: "input", light: "#6B9580", dark: "#5E9A7F" },
  { name: "Focus ring", token: "ring", light: "#0A7A49", dark: "#B7E1CE" },
];

const SEMANTIC: { role: string; solid: Swatch; subtle: Swatch }[] = [
  {
    role: "Success",
    solid: { name: "Solid", token: "success", light: "#17803D", dark: "#4ADE80", on: "success-foreground" },
    subtle: { name: "Subtle", token: "success-subtle", light: "#E4F4E9", dark: "#0B3D22", on: "success-subtle-foreground" },
  },
  {
    role: "Warning",
    solid: { name: "Solid", token: "warning", light: "#B45309", dark: "#FB923C", on: "warning-foreground" },
    subtle: { name: "Subtle", token: "warning-subtle", light: "#FEF3C7", dark: "#3F2406", on: "warning-subtle-foreground" },
  },
  {
    role: "Info",
    solid: { name: "Solid", token: "info", light: "#1D6FB8", dark: "#60A5FA", on: "info-foreground" },
    subtle: { name: "Subtle", token: "info-subtle", light: "#E3F0FB", dark: "#0F2F4F", on: "info-subtle-foreground" },
  },
  {
    role: "Error",
    solid: { name: "Solid", token: "destructive", light: "#C62828", dark: "#F87171", on: "destructive-foreground" },
    subtle: { name: "Subtle", token: "destructive-subtle", light: "#FDECEA", dark: "#4A1414", on: "destructive-subtle-foreground" },
  },
];

function SwatchCard({ swatch }: { swatch: Swatch }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
      <div
        className="flex h-24 items-end p-3 text-lg font-semibold"
        style={{
          backgroundColor: `var(--${swatch.token})`,
          color: swatch.on
            ? swatch.on.startsWith("#")
              ? swatch.on
              : `var(--${swatch.on})`
            : undefined,
        }}
      >
        {swatch.on ? "Aa" : ""}
      </div>
      <div className="space-y-1 p-3 text-sm">
        <p className="font-medium">{swatch.name}</p>
        <p className="font-mono text-xs text-muted-foreground">--{swatch.token}</p>
        <p className="font-mono text-xs text-muted-foreground">
          {swatch.light === swatch.dark
            ? swatch.light
            : `${swatch.light} light · ${swatch.dark} dark`}
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
        {note ? <p className="max-w-[65ch] text-muted-foreground">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

const GRID = "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5";

export default function DesignPage() {
  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-24 px-4 py-16 sm:px-8 sm:py-24">
      <header className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-4">
          <h1 className="text-5xl font-semibold leading-none tracking-tight sm:text-7xl">
            YaadGuide design tokens
          </h1>
          <p className="max-w-[65ch] text-lg text-muted-foreground">
            Colors and type as they are wired into the app. Switch the theme to
            check both modes.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Section
        title="Brand colors"
        note="The founder's palette. Primary is #0A7A49: white text on it is 5.39:1, so it works for buttons and small text in light mode. In dark mode it is too dim against the background for text or borders; buttons switch to a lighter green."
      >
        <div className={GRID}>
          {BRAND.map((s) => (
            <SwatchCard key={s.token} swatch={s} />
          ))}
        </div>
      </Section>

      <Section
        title="Surfaces and controls"
        note="Shadcn tokens. Each swatch shows its paired text color as “Aa”."
      >
        <div className={GRID}>
          {CORE.map((s) => (
            <SwatchCard key={s.token} swatch={s} />
          ))}
        </div>
      </Section>

      <Section
        title="Semantic colors"
        note="Always pair with an icon and text, never color alone. Warning is orange in dark mode so it is not confused with the yellow call to action."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          {SEMANTIC.map(({ role, solid, subtle }) => (
            <div key={role} className="space-y-3">
              <h3 className="text-xl font-semibold">{role}</h3>
              <div className="grid grid-cols-2 gap-4">
                <SwatchCard swatch={solid} />
                <SwatchCard swatch={subtle} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Type"
        note="Bricolage Grotesque for headings, Figtree for body and interface text. The pairing is pending founder confirmation."
      >
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            <p className="font-mono text-sm text-muted-foreground">
              Headings: Bricolage Grotesque
            </p>
            <p className="font-heading text-6xl font-semibold leading-none tracking-tight sm:text-7xl">
              From vision to voyage
            </p>
            <div className="space-y-3">
              <p className="font-heading text-4xl font-semibold tracking-tight">
                Choose your comfort
              </p>
              <p className="font-heading text-3xl font-semibold tracking-tight">
                Home away from home
              </p>
              <p className="font-heading text-2xl font-semibold tracking-tight">
                Enjoy Jamaica every day
              </p>
              <p className="font-heading text-xl font-semibold">Pay at checkout</p>
            </div>
            <p className="font-heading text-lg text-muted-foreground">
              Weights: 400 regular, 500 medium, 600 semibold, 700 bold
            </p>
          </div>

          <div className="space-y-6">
            <p className="font-mono text-sm text-muted-foreground">
              Body and interface: Figtree
            </p>
            <p className="max-w-[65ch] text-base leading-normal">
              Plan your trip your way. Pick a stay, book a verified driver and
              fill your days with things to do, all in one itinerary. Every
              vendor on YaadGuide is reviewed before travelers can book them.
            </p>
            <p className="max-w-[65ch] text-sm text-muted-foreground">
              Small text is 14px and never goes below 12px. Cancellation policy:
              moderate. Free cancellation until 24 hours before check-in.
            </p>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-lg">
              <span className="font-normal">Regular 400</span>
              <span className="font-medium">Medium 500</span>
              <span className="font-semibold">Semibold 600</span>
              <span className="font-bold">Bold 700</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Prices use tabular figures</p>
              <p className="text-3xl font-semibold tabular-nums">US $1,240.50</p>
              <p className="text-3xl font-semibold tabular-nums">US $ 89.00</p>
            </div>
            <p className="font-mono text-sm">Mono: --brand #0A7A49 (Geist Mono)</p>
          </div>
        </div>
      </Section>

      <Section
        title="Components"
        note="Shadcn base components with the tokens applied. Toasts and tooltips are wired into the root layout."
      >
        <div className="space-y-8">
          <ButtonDemo />
          <ToastDemo />
          <TooltipDemo />
          <TooltipToastTest />
        </div>
      </Section>

      <Section
        title="Form controls"
        note="Every control is at least 44px tall below 768px wide, and compact from there up."
      >
        <ControlsDemo />
      </Section>
    </main>
  );
}
