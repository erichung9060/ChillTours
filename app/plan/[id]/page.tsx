/**
 * Planning Interface Page
 * 
 * Three-panel layout: itinerary (left), map (center), chat (right, collapsible)
 * Responsive layout for mobile (single-column)
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { ItineraryPanel } from '@/components/planner/itinerary-panel';
import { MapPanel } from '@/components/planner/map-panel';
import { ChatPanel } from '@/components/planner/chat-panel';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { useSessionContext } from '@/lib/session/session-provider';
import type { Itinerary } from '@/types/itinerary';

// Panel width constraints
const MIN_ITINERARY_PANEL_WIDTH = 200;
const MIN_CHAT_PANEL_WIDTH = 200;
const DEFAULT_ITINERARY_PANEL_WIDTH = 500;
const DEFAULT_CHAT_PANEL_WIDTH = 400;

export default function PlanningPage() {
  const params = useParams();
  const itineraryId = params.id as string;
  const { session, setCurrentItinerary } = useSessionContext();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(true);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [itineraryPanelWidth, setItineraryPanelWidth] = useState(DEFAULT_ITINERARY_PANEL_WIDTH);
  const [chatPanelWidth, setChatPanelWidth] = useState(DEFAULT_CHAT_PANEL_WIDTH);
  const [isResizingItinerary, setIsResizingItinerary] = useState(false);
  const [isResizingChat, setIsResizingChat] = useState(false);

  // Load itinerary data
  useEffect(() => {
    async function loadItinerary() {
      try {
        setIsLoading(true);
        setError(null);

        // TODO: Implement actual itinerary loading from database
        // For now, use mock data or session data
        if (session.current_itinerary) {
          setItinerary(session.current_itinerary);
          setIsLoading(false);
          return;
        }

        // Simulate loading
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock itinerary for development
        const mockItinerary: Itinerary = {
          id: itineraryId,
          user_id: 'mock-user-id',
          title: 'Tokyo Adventure',
          destination: 'Tokyo, Japan',
          start_date: '2026-03-01',
          end_date: '2026-03-05',
          days: [
            {
              day_number: 1,
              date: '2026-03-01',
              activities: [
                {
                  id: crypto.randomUUID(),
                  time: '09:00',
                  title: 'Arrive at Narita Airport',
                  description: 'Take the Narita Express to Tokyo Station',
                  location: {
                    name: 'Narita International Airport',
                    address: '1-1 Furugome, Narita, Chiba 282-0004, Japan',
                    lat: 35.7647,
                    lng: 140.3864,
                  },
                  duration_minutes: 120,
                  order: 0,
                },
                {
                  id: crypto.randomUUID(),
                  time: '14:00',
                  title: 'Check into Hotel',
                  description: 'Drop off luggage and freshen up',
                  location: {
                    name: 'Shibuya Hotel',
                    address: 'Shibuya, Tokyo, Japan',
                    lat: 35.6595,
                    lng: 139.7004,
                  },
                  duration_minutes: 60,
                  order: 1,
                },
                {
                  id: crypto.randomUUID(),
                  time: '16:00',
                  title: 'Explore Shibuya Crossing',
                  description: 'Visit the famous scramble crossing and surrounding area',
                  location: {
                    name: 'Shibuya Crossing',
                    address: '2 Chome-2-1 Dogenzaka, Shibuya City, Tokyo 150-0043, Japan',
                    lat: 35.6595,
                    lng: 139.7004,
                  },
                  duration_minutes: 120,
                  order: 2,
                },
                {
                  id: crypto.randomUUID(),
                  time: '19:00',
                  title: 'Dinner at Ichiran Ramen',
                  description: 'Try authentic tonkotsu ramen at this famous chain',
                  location: {
                    name: 'Ichiran Shibuya',
                    address: '1-22-7 Jinnan, Shibuya City, Tokyo 150-0041, Japan',
                    lat: 35.6627,
                    lng: 139.6989,
                  },
                  duration_minutes: 90,
                  order: 3,
                },
              ],
            },
            {
              day_number: 2,
              date: '2026-03-02',
              activities: [
                {
                  id: crypto.randomUUID(),
                  time: '08:00',
                  title: 'Tsukiji Outer Market',
                  description: 'Fresh sushi breakfast and explore the market',
                  location: {
                    name: 'Tsukiji Outer Market',
                    address: '4 Chome-16-2 Tsukiji, Chuo City, Tokyo 104-0045, Japan',
                    lat: 35.6654,
                    lng: 139.7707,
                  },
                  duration_minutes: 120,
                  order: 0,
                },
                {
                  id: crypto.randomUUID(),
                  time: '11:00',
                  title: 'Senso-ji Temple',
                  description: 'Visit Tokyo\'s oldest temple in Asakusa',
                  location: {
                    name: 'Senso-ji Temple',
                    address: '2 Chome-3-1 Asakusa, Taito City, Tokyo 111-0032, Japan',
                    lat: 35.7148,
                    lng: 139.7967,
                  },
                  duration_minutes: 90,
                  order: 1,
                },
                {
                  id: crypto.randomUUID(),
                  time: '13:00',
                  title: 'Lunch at Nakamise Shopping Street',
                  description: 'Try traditional Japanese street food',
                  location: {
                    name: 'Nakamise Shopping Street',
                    address: '1 Chome-36-3 Asakusa, Taito City, Tokyo 111-0032, Japan',
                    lat: 35.7119,
                    lng: 139.7965,
                  },
                  duration_minutes: 60,
                  order: 2,
                },
                {
                  id: crypto.randomUUID(),
                  time: '15:00',
                  title: 'Tokyo Skytree',
                  description: 'Panoramic views from the observation deck',
                  location: {
                    name: 'Tokyo Skytree',
                    address: '1 Chome-1-2 Oshiage, Sumida City, Tokyo 131-0045, Japan',
                    lat: 35.7101,
                    lng: 139.8107,
                  },
                  duration_minutes: 120,
                  order: 3,
                },
                {
                  id: crypto.randomUUID(),
                  time: '18:30',
                  title: 'Dinner in Akihabara',
                  description: 'Explore the electric town and have dinner at a themed cafe',
                  location: {
                    name: 'Akihabara Electric Town',
                    address: 'Sotokanda, Chiyoda City, Tokyo 101-0021, Japan',
                    lat: 35.7022,
                    lng: 139.7744,
                  },
                  duration_minutes: 150,
                  order: 4,
                },
              ],
            },
            {
              day_number: 3,
              date: '2026-03-03',
              activities: [
                {
                  id: crypto.randomUUID(),
                  time: '09:00',
                  title: 'Meiji Shrine',
                  description: 'Peaceful shrine surrounded by forest in the heart of Tokyo',
                  location: {
                    name: 'Meiji Shrine',
                    address: '1-1 Yoyogikamizonocho, Shibuya City, Tokyo 151-8557, Japan',
                    lat: 35.6764,
                    lng: 139.6993,
                  },
                  duration_minutes: 90,
                  order: 0,
                },
                {
                  id: crypto.randomUUID(),
                  time: '11:00',
                  title: 'Harajuku Takeshita Street',
                  description: 'Explore trendy fashion and unique shops',
                  location: {
                    name: 'Takeshita Street',
                    address: '1 Chome-17 Jingumae, Shibuya City, Tokyo 150-0001, Japan',
                    lat: 35.6702,
                    lng: 139.7037,
                  },
                  duration_minutes: 120,
                  order: 1,
                },
                {
                  id: crypto.randomUUID(),
                  time: '13:30',
                  title: 'Lunch at Omotesando',
                  description: 'Upscale dining in Tokyo\'s Champs-Élysées',
                  location: {
                    name: 'Omotesando',
                    address: 'Jingumae, Shibuya City, Tokyo 150-0001, Japan',
                    lat: 35.6652,
                    lng: 139.7125,
                  },
                  duration_minutes: 90,
                  order: 2,
                },
                {
                  id: crypto.randomUUID(),
                  time: '16:00',
                  title: 'teamLab Borderless',
                  description: 'Immersive digital art museum experience',
                  location: {
                    name: 'teamLab Borderless',
                    address: '1-3-8 Aomi, Koto City, Tokyo 135-0064, Japan',
                    lat: 35.6251,
                    lng: 139.7753,
                  },
                  duration_minutes: 150,
                  order: 3,
                },
                {
                  id: crypto.randomUUID(),
                  time: '19:30',
                  title: 'Dinner at Odaiba',
                  description: 'Waterfront dining with Rainbow Bridge views',
                  location: {
                    name: 'Odaiba Seaside Park',
                    address: '1 Chome Daiba, Minato City, Tokyo 135-0091, Japan',
                    lat: 35.6297,
                    lng: 139.7744,
                  },
                  duration_minutes: 120,
                  order: 4,
                },
              ],
            },
            {
              day_number: 4,
              date: '2026-03-04',
              activities: [
                {
                  id: crypto.randomUUID(),
                  time: '08:00',
                  title: 'Day Trip to Mount Fuji',
                  description: 'Scenic bus tour to Japan\'s iconic mountain',
                  location: {
                    name: 'Mount Fuji 5th Station',
                    address: 'Narusawa, Minamitsuru District, Yamanashi 401-0320, Japan',
                    lat: 35.3606,
                    lng: 138.7274,
                  },
                  duration_minutes: 180,
                  order: 0,
                },
                {
                  id: crypto.randomUUID(),
                  time: '12:00',
                  title: 'Lunch at Kawaguchiko',
                  description: 'Local cuisine with lake and mountain views',
                  location: {
                    name: 'Lake Kawaguchi',
                    address: 'Fujikawaguchiko, Minamitsuru District, Yamanashi 401-0301, Japan',
                    lat: 35.5131,
                    lng: 138.7634,
                  },
                  duration_minutes: 90,
                  order: 1,
                },
                {
                  id: crypto.randomUUID(),
                  time: '14:00',
                  title: 'Oshino Hakkai',
                  description: 'Eight sacred ponds with crystal clear spring water',
                  location: {
                    name: 'Oshino Hakkai',
                    address: 'Shibokusa, Oshino, Minamitsuru District, Yamanashi 401-0511, Japan',
                    lat: 35.4564,
                    lng: 138.8419,
                  },
                  duration_minutes: 90,
                  order: 2,
                },
                {
                  id: crypto.randomUUID(),
                  time: '16:30',
                  title: 'Return to Tokyo',
                  description: 'Bus ride back to the city',
                  location: {
                    name: 'Shinjuku Station',
                    address: '3 Chome-38-1 Shinjuku, Shinjuku City, Tokyo 160-0022, Japan',
                    lat: 35.6896,
                    lng: 139.7006,
                  },
                  duration_minutes: 150,
                  order: 3,
                },
                {
                  id: crypto.randomUUID(),
                  time: '20:00',
                  title: 'Dinner at Shinjuku',
                  description: 'Explore the vibrant nightlife and dining scene',
                  location: {
                    name: 'Omoide Yokocho',
                    address: '1 Chome-2 Nishishinjuku, Shinjuku City, Tokyo 160-0023, Japan',
                    lat: 35.6938,
                    lng: 139.7009,
                  },
                  duration_minutes: 120,
                  order: 4,
                },
              ],
            },
            {
              day_number: 5,
              date: '2026-03-05',
              activities: [
                {
                  id: crypto.randomUUID(),
                  time: '09:00',
                  title: 'Imperial Palace East Gardens',
                  description: 'Stroll through the beautiful palace gardens',
                  location: {
                    name: 'Imperial Palace East Gardens',
                    address: '1-1 Chiyoda, Chiyoda City, Tokyo 100-8111, Japan',
                    lat: 35.6852,
                    lng: 139.7528,
                  },
                  duration_minutes: 120,
                  order: 0,
                },
                {
                  id: crypto.randomUUID(),
                  time: '11:30',
                  title: 'Ginza Shopping District',
                  description: 'Luxury shopping and window browsing',
                  location: {
                    name: 'Ginza',
                    address: 'Ginza, Chuo City, Tokyo 104-0061, Japan',
                    lat: 35.6717,
                    lng: 139.7650,
                  },
                  duration_minutes: 150,
                  order: 1,
                },
                {
                  id: crypto.randomUUID(),
                  time: '14:30',
                  title: 'Last Minute Souvenir Shopping',
                  description: 'Pick up gifts and souvenirs at Tokyo Station',
                  location: {
                    name: 'Tokyo Station',
                    address: '1 Chome Marunouchi, Chiyoda City, Tokyo 100-0005, Japan',
                    lat: 35.6812,
                    lng: 139.7671,
                  },
                  duration_minutes: 90,
                  order: 2,
                },
                {
                  id: crypto.randomUUID(),
                  time: '16:30',
                  title: 'Check out from Hotel',
                  description: 'Collect luggage and head to the airport',
                  location: {
                    name: 'Shibuya Hotel',
                    address: 'Shibuya, Tokyo, Japan',
                    lat: 35.6595,
                    lng: 139.7004,
                  },
                  duration_minutes: 60,
                  order: 3,
                },
                {
                  id: crypto.randomUUID(),
                  time: '18:00',
                  title: 'Depart from Narita Airport',
                  description: 'Check-in and departure',
                  location: {
                    name: 'Narita International Airport',
                    address: '1-1 Furugome, Narita, Chiba 282-0004, Japan',
                    lat: 35.7647,
                    lng: 140.3864,
                  },
                  duration_minutes: 180,
                  order: 4,
                },
              ],
            },
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          shared_with: [],
        };

        setItinerary(mockItinerary);
        setCurrentItinerary(mockItinerary);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load itinerary:', err);
        setError('Failed to load itinerary. Please try again.');
        setIsLoading(false);
      }
    }

    loadItinerary();
  }, [itineraryId, session.current_itinerary, setCurrentItinerary]);

  // Handle itinerary updates
  const handleItineraryUpdate = (updatedItinerary: Itinerary) => {
    setItinerary(updatedItinerary);
    setCurrentItinerary(updatedItinerary);
  };

  // Toggle chat panel (Requirement 4.4)
  const toggleChat = () => {
    setIsChatOpen(prev => !prev);
  };

  // Handle resizing of itinerary panel
  const handleItineraryPanelResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingItinerary(true);
  };

  // Handle resizing of chat panel
  const handleChatPanelResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingChat(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const windowWidth = window.innerWidth;

      // Handle itinerary panel resizing
      if (isResizingItinerary) {
        const newItineraryWidth = e.clientX;
        
        // Only enforce minimum width
        if (newItineraryWidth >= MIN_ITINERARY_PANEL_WIDTH) {
          setItineraryPanelWidth(newItineraryWidth);
        }
      }

      // Handle chat panel resizing
      if (isResizingChat) {
        const newChatWidth = windowWidth - e.clientX;
        
        // Only enforce minimum width
        if (newChatWidth >= MIN_CHAT_PANEL_WIDTH && e.clientX >= MIN_ITINERARY_PANEL_WIDTH) {
          setChatPanelWidth(newChatWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingItinerary(false);
      setIsResizingChat(false);
    };

    const isResizing = isResizingItinerary || isResizingChat;

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Prevent text selection while resizing
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizingItinerary, isResizingChat]);

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center pt-16">
          <Loading size="lg" text="Loading your itinerary..." />
        </main>
      </>
    );
  }

  if (error || !itinerary) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center pt-16 px-4">
          <ErrorMessage
            title="Failed to Load Itinerary"
            message={error || 'Itinerary not found'}
            onRetry={() => window.history.back()}
          />
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="h-screen flex flex-col pt-16">
        {/* Three-panel layout (Requirement 4.1) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Itinerary Panel (Requirement 4.2) - Resizable */}
          <div 
            className={`hidden md:block border-r border-border overflow-y-auto relative ${!isMapVisible ? 'flex-1' : ''}`}
            style={isMapVisible ? { width: `${itineraryPanelWidth}px` } : undefined}
          >
            <ItineraryPanel
              itinerary={itinerary}
              onUpdate={handleItineraryUpdate}
            />
            
            {/* Resize Handle - Only show when map is visible */}
            {isMapVisible && (
              <div
                className="absolute top-0 right-0 w-5 h-full cursor-col-resize hover:bg-primary/20 active:bg-primary/40 transition-colors group"
                onMouseDown={handleItineraryPanelResize}
              >
              </div>
            )}
          </div>

          {/* Mobile: Full-width Itinerary Panel */}
          <div className="md:hidden w-full border-r border-border overflow-y-auto">
            <ItineraryPanel
              itinerary={itinerary}
              onUpdate={handleItineraryUpdate}
            />
          </div>

          {/* Center Panel: Map (Requirement 4.3) - Conditionally rendered */}
          {isMapVisible && (
            <div className="hidden md:flex flex-1 relative">
              <MapPanel itinerary={itinerary} />
            </div>
          )}

          {/* Chat Panel (Collapsible) (Requirement 4.4) - Resizable, Always positioned at right edge */}
          {/* Only show on desktop (md+) when chat is open */}
          {isChatOpen && (
            <div
              className="hidden md:block relative border-l border-border"
              style={{ width: `${chatPanelWidth}px` }}
            >
              {/* Resize Handle - on the left side of chat panel */}
              <div
                className="absolute top-0 left-0 w-5 h-full cursor-col-resize hover:bg-primary/20 active:bg-primary/40 transition-colors z-10"
                onMouseDown={handleChatPanelResize}
              >
              </div>
              <ChatPanel
                itinerary={itinerary}
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                onItineraryUpdate={handleItineraryUpdate}
              />
            </div>
          )}
        </div>

        {/* Desktop: Chat Toggle Button - Only show on desktop when chat is closed */}
        {!isChatOpen && (
          <button
            onClick={toggleChat}
            className="hidden md:flex fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 items-center justify-center"
            aria-label="Open chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        )}
      </main>
    </>
  );
}
