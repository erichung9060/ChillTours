import type { Location } from "@/types/itinerary";

/**
 * Creates a navigation link for Google Maps based on the provided location.
 *
 * @param location The location object
 * @returns A Google Maps search URL
 */
export function createNavigationLink(location: Location): string {
    const { name, place_id } = location;

    if (place_id) {
        return `https://www.google.com/maps/place/?q=place_id:${place_id}`;
    } else {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
    }
}
