import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { TransferQueue } from "@/components/admin/transfer-queue";
import { VendorPage } from "@/components/vendor/vendor-page";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdminQueue } from "@/lib/vendor/admin-queries";

export const metadata: Metadata = {
  title: "Vendor review | YaadGuide",
};

async function Queue(): Promise<React.JSX.Element> {
  const queue = await getAdminQueue();
  if (!queue) redirect("/auth/forbidden");

  const { profiles, transfers } = queue;

  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="profiles-heading" className="flex flex-col gap-4">
        <h2 id="profiles-heading" className="text-xl font-semibold">
          Profiles waiting for review
        </h2>
        {profiles.length === 0 ? (
          <p className="text-muted-foreground">Nothing is waiting. New submissions show up here, oldest first.</p>
        ) : (
          <div className="rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>
                    <span className="sr-only">Action</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.ownerName}</TableCell>
                    <TableCell>{profile.businessName || "Not set"}</TableCell>
                    <TableCell>{profile.primaryRegion}</TableCell>
                    <TableCell className="tabular-nums">{profile.submittedAt.slice(0, 10)}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/vendors/${profile.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Review
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section aria-labelledby="transfers-heading" className="flex flex-col gap-4">
        <h2 id="transfers-heading" className="text-xl font-semibold">
          Vehicle transfers
        </h2>
        <TransferQueue transfers={transfers} />
      </section>
    </div>
  );
}

export default function Page(): React.JSX.Element {
  return (
    <VendorPage
      title="Vendor review"
      description="Check documents, then approve a profile or send it back with a reason."
      backHref="/"
      backLabel="Home"
      wide
    >
      <Suspense
        fallback={
          <div className="flex flex-col gap-4" aria-busy="true">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        }
      >
        <Queue />
      </Suspense>
    </VendorPage>
  );
}
