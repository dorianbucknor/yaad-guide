import { VendorShell } from "@/components/shell/vendor-shell";

export default function VendorLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <VendorShell>{children}</VendorShell>;
}
