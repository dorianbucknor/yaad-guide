"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { type ThemePreference, useThemeStore } from "@/stores/theme-store";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof SunIcon }[] = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
];

export function ThemeToggle() {
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);

  return (
    <div role="group" aria-label="Theme" className="flex gap-2">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          variant={preference === value ? "default" : "outline"}
          aria-pressed={preference === value}
          onClick={() => setPreference(value)}
        >
          <Icon data-icon="inline-start" />
          {label}
        </Button>
      ))}
    </div>
  );
}
