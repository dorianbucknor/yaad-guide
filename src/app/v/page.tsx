import { redirect } from "next/navigation";

/** /v is the vendor entry point; Move is the category that is open for business. */
export default function Page(): never {
  redirect("/v/move");
}
