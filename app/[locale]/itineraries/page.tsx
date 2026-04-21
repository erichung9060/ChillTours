"use client";

import { useEffect } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useItineraries } from "@/hooks/use-itineraries";
import { useTranslations } from "next-intl";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Loading } from "@/components/ui/loading";
import { ErrorMessage } from "@/components/ui/error-message";
import { ItineraryList } from "@/components/itineraries/itinerary-list";
import { EmptyState } from "@/components/itineraries/empty-state";
import { Button } from "@/components/ui/button";

/**
 * Itineraries Page
 *
 * Main page for displaying user's itineraries with authentication protection.
 * Redirects unauthenticated users to the home page.
 *
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.4, 2.5, 3.1, 4.2, 5.1, 5.2
 */
export default function ItinerariesPage() {
  const t = useTranslations("itineraries");
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { itineraries, loading: dataLoading, error, refetch } = useItineraries();

  // Authentication check and redirect
  useEffect(() => {
    if (!authLoading && (!user || user.is_anonymous)) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Handle card click navigation - open in new tab
  const handleCardClick = (id: string) => {
    window.open(`/plan/${id}`, "_blank");
  };

  // Handle create button click
  const handleCreateClick = () => {
    router.push("/");
  };

  // Show nothing while checking authentication
  if (authLoading) {
    return null;
  }

  // Don't render anything if user is not authenticated or is anonymous (will redirect)
  if (!user || user.is_anonymous) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-1 pt-24 pb-16 px-4 w-full max-w-[1600px] mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{t("title")}</h1>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>

          {!dataLoading && !error && itineraries.length > 0 && (
            <Button variant="primary" size="lg" onClick={handleCreateClick}>
              {t("createNew")}
            </Button>
          )}
        </div>

        {/* Loading state */}
        {dataLoading && (
          <div className="flex justify-center items-center min-h-[60vh]">
            <Loading size="lg" text={t("loading")} />
          </div>
        )}

        {/* Error state */}
        {error && (
          <ErrorMessage title={t("loadError")} message={t("loadErrorMessage")} onRetry={refetch} />
        )}

        {/* Content - only show when not loading and no error */}
        {!dataLoading && !error && (
          <>
            {itineraries.length === 0 ? (
              <EmptyState onCreateClick={handleCreateClick} />
            ) : (
              <ItineraryList itineraries={itineraries} onCardClick={handleCardClick} />
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
