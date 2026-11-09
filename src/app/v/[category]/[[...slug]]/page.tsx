import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/skeleton";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { VendorPage } from "@/components/vendor/vendor-page";
import { SHELL_ICONS } from "@/components/shell/shell-icons";

const CATEGORIES = { stay: { name: "Stay", icon: "stay" } } as const;
const PAGES = { "": "Dashboard", calendar: "Calendar", listing: "Listings", profile: "Vendor profile" } as const;

type Params = { category: string; slug?: string[] };

export function generateStaticParams(): Params[] {
  return Object.keys(CATEGORIES).flatMap((category) => [
    { category, slug: [] },
    ...Object.keys(PAGES)
      .filter(Boolean)
      .map((page) => ({ category, slug: [page] })),
  ]);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { category } = await params;
  const name = CATEGORIES[category as keyof typeof CATEGORIES]?.name ?? "Vendor";
  return { title: `${name} | YaadGuide` };
}

async function Body({ params }: { params: Promise<Params> }): Promise<React.JSX.Element> {
  const { category, slug = [] } = await params;
  const info = CATEGORIES[category as keyof typeof CATEGORIES];
  const page = PAGES[(slug[0] ?? "") as keyof typeof PAGES];
  if (!info || !page || slug.length > 1) notFound();
  const Icon = SHELL_ICONS[info.icon];

  return (
    <VendorPage title={`${info.name} ${page.toLowerCase()}`} description={`Vendor tools for ${info.name}.`}>
      <Empty className="max-w-xl self-start border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Icon aria-hidden />
          </EmptyMedia>
          <EmptyTitle>{info.name} vendors are coming soon</EmptyTitle>
          <EmptyDescription>
            Move is open for vendors now. {info.name} listings, bookings and your {info.name} profile will appear here when it opens.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </VendorPage>
  );
}

export default function Page({ params }: { params: Promise<Params> }): React.JSX.Element {
  return (
    <Suspense fallback={<Skeleton className="h-48 max-w-xl rounded-2xl" aria-busy="true" />}>
      <Body params={params} />
    </Suspense>
  );
}
