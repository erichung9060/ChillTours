"use client";

const destinations = [
  { name: "Seoul", flag: "🇰🇷" },
  { name: "Tokyo", flag: "🇯🇵" },
  { name: "Los Angeles", flag: "🇺🇸" },
  { name: "Hong Kong", flag: "🇭🇰" },
];

interface TrendingDestinationsProps {
  onDestinationClick?: (destination: string) => void;
}

export function TrendingDestinations({
  onDestinationClick,
}: TrendingDestinationsProps) {
  return (
    <div className="mt-8 text-center">
      <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
        Trending Destinations
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {destinations.map((dest) => (
          <button
            key={dest.name}
            onClick={() => onDestinationClick?.(dest.name)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-secondary/30 hover:bg-secondary hover:border-border transition-all duration-200 hover:scale-105 active:scale-95 text-sm"
          >
            <span>{dest.flag}</span>
            <span className="font-medium">{dest.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
