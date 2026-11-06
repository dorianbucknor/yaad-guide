"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

import { useThemeStore } from "@/stores/theme-store"

const Toaster = ({ ...props }: ToasterProps) => {
  // Theme comes from our zustand store, not next-themes.
  const theme = useThemeStore((state) => state.resolved)

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          // Typed toasts use the semantic tokens from globals.css (light and dark).
          "--success-bg": "var(--success-subtle)",
          "--success-text": "var(--success-subtle-foreground)",
          "--success-border": "var(--success)",
          "--info-bg": "var(--info-subtle)",
          "--info-text": "var(--info-subtle-foreground)",
          "--info-border": "var(--info)",
          "--warning-bg": "var(--warning-subtle)",
          "--warning-text": "var(--warning-subtle-foreground)",
          "--warning-border": "var(--warning)",
          "--error-bg": "var(--destructive-subtle)",
          "--error-text": "var(--destructive-subtle-foreground)",
          "--error-border": "var(--destructive)",
        } as React.CSSProperties
      }
      richColors
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
