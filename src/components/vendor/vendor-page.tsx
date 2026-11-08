import { cn } from "@/lib/utils";

/** Page heading and width for the vendor and admin screens; the shell supplies navigation and the main landmark. */
export function VendorPage({
  title,
  description,
  wide = false,
  full = false,
  children,
}: {
  title: string;
  description?: string;
  /** Kept for existing callers; the shell's navigation replaces the back link. */
  backHref?: string;
  backLabel?: string;
  wide?: boolean;
  full?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className={cn("flex w-full flex-col gap-6", !full && (wide ? "max-w-4xl" : "max-w-2xl"))}>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {description ? <p className="max-w-[65ch] text-muted-foreground">{description}</p> : null}
      </header>
      {children}
    </div>
  );
}
