"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useItineraries } from "@/hooks/use-itineraries";
import { Header } from "@/components/layout/header";
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
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { itineraries, loading: dataLoading, error, refetch } = useItineraries();

  // Authentication check and redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Handle card click navigation
  const handleCardClick = (id: string) => {
    router.push(`/plan/${id}`);
  };

  // Handle create button click
  const handleCreateClick = () => {
    router.push("/");
  };

  // Show nothing while checking authentication
  if (authLoading) {
    return null;
  }

  // Don't render anything if user is not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16 px-4 max-w-[1600px] mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              我的行程
            </h1>
            <p className="text-muted-foreground">
              管理和查看您的所有旅行計畫
            </p>
          </div>
          
          {!dataLoading && !error && itineraries.length > 0 && (
            <Button variant="primary" size="lg" onClick={handleCreateClick}>
              建立新行程
            </Button>
          )}
        </div>

        {/* Loading state */}
        {dataLoading && (
          <div className="flex justify-center items-center min-h-[60vh]">
            <Loading size="lg" text="載入行程中..." />
          </div>
        )}

        {/* Error state */}
        {error && (
          <ErrorMessage
            title="載入失敗"
            message="無法載入您的行程。請稍後再試。"
            onRetry={refetch}
          />
        )}

        {/* Content - only show when not loading and no error */}
        {!dataLoading && !error && (
          <>
            {itineraries.length === 0 ? (
              <EmptyState onCreateClick={handleCreateClick} />
            ) : (
              <ItineraryList
                itineraries={itineraries}
                onCardClick={handleCardClick}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
