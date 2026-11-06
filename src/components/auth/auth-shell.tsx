import Image from "next/image";
import Link from "next/link";

import { Logo, Wordmark } from "@/components/landing/logo";

export function AuthShell({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center md:justify-start">
          <Link href="/" className="flex items-center gap-2 text-xl">
            <Logo className="h-7 w-auto" />
            <Wordmark />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <Image
          src="/landing/beach.webp"
          alt=""
          fill
          sizes="50vw"
          className="object-cover dark:brightness-[0.6]"
        />
      </div>
    </div>
  );
}
