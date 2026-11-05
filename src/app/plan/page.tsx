import type { Metadata } from "next";

import { PlanDraft } from "@/components/plan/plan-draft";

export const metadata: Metadata = {
  title: "Your trip",
};

export default function Page(): React.JSX.Element {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 sm:py-16">
      <PlanDraft />
    </main>
  );
}
