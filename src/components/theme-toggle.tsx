"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { type ThemePreference, useThemeStore } from "@/stores/theme-store";

const NEXT: Record<ThemePreference, ThemePreference> = {
  light: "dark",
  dark: "system",
  system: "light",
};

const ICONS = {
  light: SunIcon,
  dark: MoonIcon,
  system: MonitorIcon,
} satisfies Record<ThemePreference, typeof SunIcon>;

/** Single icon button that cycles light, dark, system. */
export function ThemeToggle(): React.JSX.Element {
  // `preference` is "system" until the store rehydrates after mount, so the first render matches the server.
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);
  const Icon = ICONS[preference];

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Theme: ${preference}. Switch to ${NEXT[preference]}`}
      onClick={() => setPreference(NEXT[preference])}
    >
      <Icon aria-hidden="true" />
    </Button>
  );
}
