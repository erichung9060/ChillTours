import { Header } from "@/components/layout/header";
import { HeroSection } from "@/components/landing/hero-section";
import { TripForm } from "@/components/landing/trip-form";

export default function Home() {
  return (
    <>
      <Header />
      <main className="min-h-screen flex flex-col pt-16">
        {/* Main content - centered vertically and horizontally */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 md:py-12">
          <div className="w-full max-w-4xl mx-auto space-y-6 md:space-y-8">
            <HeroSection />
            <TripForm />
          </div>
        </div>

        {/* Footer */}
        <footer className="py-4 text-center text-sm text-muted-foreground border-t border-border/40">
          <p>© 2026 TripAI. Made for the curious</p>
        </footer>
      </main>
    </>
  );
}
