import { SmartphoneIcon } from "lucide-react";

/*
 * Brand-dark canvas in both themes. In dark mode the page background is the same
 * brand-dark, so the canvas gets a thin brand-light border to stay distinct.
 * No store buttons until the app exists.
 */
export function AppComingSoon(): React.JSX.Element {
  return (
    <section aria-labelledby="app-heading" className="pb-16 md:pb-32">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="flex flex-col gap-8 rounded-[2.5rem] bg-brand-dark px-6 py-12 text-white md:flex-row md:items-center md:gap-12 md:px-16 md:py-16 dark:border dark:border-brand-light/30">
          <div
            aria-hidden="true"
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-sun text-brand-dark md:size-24"
          >
            <SmartphoneIcon className="size-8 md:size-12" />
          </div>
          <div className="min-w-0">
            <h2
              id="app-heading"
              className="text-3xl font-bold tracking-tight md:text-5xl"
            >
              Download the app
            </h2>
            <p className="mt-2 text-xl font-medium text-sun">Coming soon</p>
            <p className="mt-4 max-w-[55ch] text-lg text-brand-light">
              The YaadGuide app is on its way. Until then, plan your whole trip
              here on the web.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
