import { getCurrentUser } from "@/lib/auth/server";
import { CustomCursor } from "@/components/brand/cursor";
import { LandingHeader } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { SystemSection } from "@/components/landing/system";
import { DirectionsSection } from "@/components/landing/directions";
import { InsideSection } from "@/components/landing/inside";
import { WhySection } from "@/components/landing/why";
import { FinalCta } from "@/components/landing/cta";
import { EarlyAccess } from "@/components/landing/early-access";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const user = await getCurrentUser().catch(() => null);
  const signedIn = Boolean(user);
  return (
    <div className="min-h-dvh bg-bg">
      <a href="#about" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-on-primary">
        Перейти к содержимому
      </a>
      <CustomCursor />
      <LandingHeader signedIn={signedIn} />
      <main>
        <Hero signedIn={signedIn} />
        <SystemSection />
        <DirectionsSection />
        <InsideSection />
        <WhySection />
        {!signedIn && <EarlyAccess />}
      </main>
      <FinalCta signedIn={signedIn} />
    </div>
  );
}
