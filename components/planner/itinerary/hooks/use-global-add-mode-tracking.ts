import { useEffect } from "react";
import { useItineraryStore } from "../store";

// Track mouse position globally so we can calculate immediately on mode activation
let lastMouseX = 0;
let lastMouseY = 0;

if (typeof document !== "undefined") {
  document.addEventListener(
    "mousemove",
    (e) => {
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    },
    { passive: true },
  );
}

function calculateNearestPlaceholder(
  clientX: number,
  clientY: number,
): { dayNumber: number; insertionIndex: number } | null {
  const dayLists = document.querySelectorAll("[data-day-list]");
  if (dayLists.length === 0) return null;

  let closestDay: number | null = null;
  let closestIndex = 0;
  let closestDistance = Infinity;

  dayLists.forEach((listEl) => {
    const dayNumber = Number(listEl.getAttribute("data-day-list"));
    const listRect = listEl.getBoundingClientRect();

    const distX = Math.max(listRect.left - clientX, 0, clientX - listRect.right);
    const distY = Math.max(listRect.top - clientY, 0, clientY - listRect.bottom);
    const distance = Math.sqrt(distX * distX + distY * distY);

    if (distance > closestDistance) return;

    const cards = listEl.querySelectorAll("[data-activity-card]");
    let insertionIndex = cards.length;

    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      if (clientY < midpoint) {
        insertionIndex = i;
        break;
      }
    }

    closestDistance = distance;
    closestDay = dayNumber;
    closestIndex = insertionIndex;
  });

  return closestDay !== null ? { dayNumber: closestDay, insertionIndex: closestIndex } : null;
}

/**
 * Global mouse tracking hook for Add Activity mode.
 *
 * Attaches a single document-level mousemove listener that finds
 * the nearest insertion point across ALL day lists on screen.
 * Immediately calculates on mode activation using last known mouse position.
 * Call this once in ItineraryPanel.
 */
export function useGlobalAddModeTracking() {
  const isAddingActivity = useItineraryStore((s) => s.isAddingActivity);
  const setAddModePlaceholder = useItineraryStore((s) => s.setAddModePlaceholder);

  useEffect(() => {
    if (!isAddingActivity) return;

    // Immediately calculate on activation
    setAddModePlaceholder(calculateNearestPlaceholder(lastMouseX, lastMouseY));

    const handleMouseMove = (e: MouseEvent) => {
      setAddModePlaceholder(calculateNearestPlaceholder(e.clientX, e.clientY));
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, [isAddingActivity, setAddModePlaceholder]);
}
