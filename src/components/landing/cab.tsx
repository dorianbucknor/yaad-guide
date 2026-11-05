import Image from "next/image";
import type { Ref } from "react";

/**
 * The cab that drives the route. Decorative. Sized in px so large text
 * settings do not grow it over the stop text. The section writes its
 * left/top/transform/opacity directly; it stays hidden until a pose is set.
 */
export function Cab({ ref }: { ref: Ref<HTMLDivElement> }): React.JSX.Element {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 z-10 w-[80px] opacity-0 will-change-transform md:w-[144px]"
    >
      <Image
        src="/landing/cab.webp"
        alt=""
        width={817}
        height={512}
        sizes="(min-width: 768px) 144px, 80px"
        className="h-auto w-full"
      />
    </div>
  );
}
