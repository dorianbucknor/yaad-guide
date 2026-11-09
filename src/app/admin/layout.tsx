import { AdminShell } from "@/components/shell/admin-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <AdminShell>{children}</AdminShell>;
}
