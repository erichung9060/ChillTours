/**
 * Hook for accessing itinerary permission state
 *
 * Provides convenient access to permission checks for UI components.
 */

import { useItineraryStore } from "@/components/planner/itinerary/store";
import type { EffectivePermission } from "@/types/share";

interface UseItineraryPermissionReturn {
  permission: EffectivePermission;
  isOwner: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
  isReadOnly: boolean;
}

export function useItineraryPermission(): UseItineraryPermissionReturn {
  const permission = useItineraryStore((state) => state.access.permission);
  const canEditFn = useItineraryStore((state) => state.canEdit);
  const canDeleteFn = useItineraryStore((state) => state.canDelete);
  const canShareFn = useItineraryStore((state) => state.canShare);

  const canEdit = canEditFn();
  const canDelete = canDeleteFn();
  const canShare = canShareFn();

  return {
    permission,
    isOwner: permission === "owner",
    canEdit,
    canDelete,
    canShare,
    isReadOnly: !canEdit,
  };
}
