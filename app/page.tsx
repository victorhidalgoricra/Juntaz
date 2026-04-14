import { ExploreJuntasSection } from '@/components/landing/explore-juntas-section';
import { FeaturesGrid } from '@/components/landing/features-grid';
import { FinalCTASection } from '@/components/landing/final-cta-section';
import { HowItWorksSection } from '@/components/landing/how-it-works-section';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingNavbar } from '@/components/landing/landing-navbar';
import { SocialProofSection } from '@/components/landing/social-proof-section';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <LandingNavbar />
      <main>
        <LandingHero />
        <HowItWorksSection />
        <FeaturesGrid />
        <ExploreJuntasSection />
        <SocialProofSection />
        <FinalCTASection />
      </main>
    </div>
  );
}
