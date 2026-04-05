import type { Activity } from "@/types/itinerary";

export function MapInfoWindowContent({ activity }: { activity: Activity }) {
  return (
    <div className="p-2 max-w-xs text-slate-900">
      <h3 className="font-semibold text-sm mb-1">{activity.title}</h3>
      <p className="text-xs mb-2">
        {activity.time} • {activity.duration_minutes} min
      </p>
      <p className="text-xs mb-2">
        📍 {activity.location.name}
      </p>
      {activity.note && (
        <p className="text-xs line-clamp-3">
          {activity.note}
        </p>
      )}
    </div>
  );
}
