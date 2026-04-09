import { z } from "zod";

// ============================================================================
// Link Access Types
// ============================================================================

/**
 * Link access level for an itinerary
 * - none: Restricted (only owner and invited emails can access)
 * - view: Anyone with link can view
 * - edit: Anyone with link can edit
 */
export const LinkAccessSchema = z.enum(["none", "view", "edit"]);
export type LinkAccess = z.infer<typeof LinkAccessSchema>;

// ============================================================================
// Permission Types
// ============================================================================

export const SharePermissionSchema = z.enum(["view", "edit"]);
export type SharePermission = z.infer<typeof SharePermissionSchema>;

/**
 * Effective permission a user has on an itinerary
 * Resolution semantics:
 * 1. owner - User owns the itinerary
 * 2. Otherwise, evaluate all applicable non-owner access sources:
 *    - email share permission
 *    - link access permission
 * 3. The highest granted permission wins: edit > view > none
 * 4. none - No access is granted by any source
 */
export const EffectivePermissionSchema = z.enum(["owner", "edit", "view", "none"]);
export type EffectivePermission = z.infer<typeof EffectivePermissionSchema>;

export const AccessSourceSchema = z.enum(["owner", "email_share", "link_share"]);
export type AccessSource = z.infer<typeof AccessSourceSchema>;

export const AccessContextSchema = z.object({
  permission: EffectivePermissionSchema,
  source: AccessSourceSchema.nullable(),
});
export type AccessContext = z.infer<typeof AccessContextSchema>;

// ============================================================================
// Share Record Types
// ============================================================================

export const ItineraryShareSchema = z.object({
  id: z.uuid(),
  itinerary_id: z.uuid(),
  shared_with_email: z.email(),
  permission: SharePermissionSchema,
  created_at: z.iso.datetime(),
});

export type ItineraryShare = z.infer<typeof ItineraryShareSchema>;
