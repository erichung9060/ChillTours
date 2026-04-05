import type { Activity } from "@/types/itinerary";

export function MapInfoWindowContent({ activity }: { activity: Activity }) {
  const hasRating = activity.location.rating != null;
  const hasWebsite = !!activity.location.website;

  return (
    <div className="p-2 max-w-xs text-black font-medium">
      {/* Order and Title */}
      <h3 className="font-bold text-sm mb-1.5 flex items-start gap-1.5 leading-snug">
        <span className="shrink-0">
          {activity.order + 1}.
        </span>
        <span className="line-clamp-2">{activity.title}</span>
      </h3>

      {/* Location */}
      <p className="flex items-start gap-1 text-xs mb-2">
        <span className="shrink-0">📍</span>
        <span className="line-clamp-2">{activity.location.name}</span>
      </p>

      {/* Rating and Website */}
      {(hasRating || hasWebsite) && (
        <div className="text-[11px] mb-2 font-semibold">
          {hasRating && (
            <span>
              ⭐ {activity.location.rating}{" "}
              <span className="font-medium text-slate-700">
                ({activity.location.user_ratings_total?.toLocaleString() ?? 0})
              </span>
            </span>
          )}
          {hasRating && hasWebsite && <span className="mx-2">|</span>}
          {hasWebsite && (
            <a
              href={activity.location.website}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              onClick={(e) => e.stopPropagation()}
            >
              🔗 Website
            </a>
          )}
        </div>
      )}

      {/* Time and Duration */}
      <p className="flex items-start gap-1 text-xs mb-2">
        <span className="shrink-0">🕒</span>
        <span>
          {activity.time} • Stay {activity.duration_minutes} min
        </span>
      </p>

      {/* Notes */}
      {activity.note && (
        <div className="mt-2 pt-2 border-t border-slate-900/20">
          <p className="text-[11px] leading-relaxed line-clamp-3">
            {activity.note}
          </p>
        </div>
      )}
    </div>
  );
}
