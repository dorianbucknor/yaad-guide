import { redirect } from "next/navigation";

// Profile moved into settings; keep old links working.
export default function Page(): never {
  redirect("/settings/personal");
}
