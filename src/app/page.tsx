import { AppComingSoon } from "@/components/landing/app-coming-soon";
import { Hero } from "@/components/landing/hero";
import { QuickStart } from "@/components/landing/quick-start";
import { RouteSection } from "@/components/landing/route-section";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { VendorCta } from "@/components/landing/vendor-cta";

export default function Home(): React.JSX.Element {
  return (
    <>
      <SiteHeader />
      {/* tabIndex -1 so the skip link moves focus here, not just the scroll position. */}
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Hero>
          <QuickStart />
        </Hero>
        <RouteSection />
        <VendorCta />
        <AppComingSoon />
      </main>
      <SiteFooter />
    </>
  );
}
