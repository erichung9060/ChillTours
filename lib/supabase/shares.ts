/**
 * Share Data Layer
 *
 * Handles CRUD operations for itinerary sharing.
 * Uses direct Supabase client calls with RLS for authorization.
 *
 * Permission Resolution (Union of permissions - highest wins):
 * 1. Owner -> "owner"
 * 2. Collect all permission sources (email share + link access)
 * 3. Return highest permission: owner > edit > view > none
 *
 * Pattern: Same as lib/supabase/itineraries.ts
 */

import { supabase } from "./client";
import type {
  AccessContext,
  EffectivePermission,
  ItineraryShare,
  LinkAccess,
  SharePermission,
} from "@/types/share";
import type { Database } from "./database.types";

type ShareRow = Database["public"]["Tables"]["itinerary_shares"]["Row"];
type ShareInsert = Database["public"]["Tables"]["itinerary_shares"]["Insert"];
type ShareUpdate = Database["public"]["Tables"]["itinerary_shares"]["Update"];
type ItineraryUpdate = Database["public"]["Tables"]["itineraries"]["Update"];

// ============================================================================
// Error Classes
// ============================================================================

export class ShareNotFoundError extends Error {
  constructor(id: string) {
    super(`Share with id ${id} not found`);
    this.name = "ShareNotFoundError";
  }
}

export class ShareAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`Share already exists for ${email}`);
    this.name = "ShareAlreadyExistsError";
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function rowToShare(row: ShareRow): ItineraryShare {
  return {
    id: row.id,
    itinerary_id: row.itinerary_id,
    shared_with_email: row.shared_with_email,
    permission: row.permission as SharePermission,
    created_at: row.created_at,
  };
}

// ============================================================================
// Share CRUD Operations
// ============================================================================

/**
 * Create a new share for an itinerary
 * Only the itinerary owner can create shares (enforced by RLS)
 */
export async function createShare(
  itineraryId: string,
  email: string,
  permission: SharePermission,
): Promise<ItineraryShare> {
  const insertData: ShareInsert = {
    itinerary_id: itineraryId,
    shared_with_email: email.toLowerCase().trim(),
    permission,
  };

  const { data, error } = await (supabase
    .from("itinerary_shares")
    // @ts-ignore - Supabase type inference issue for insert payloads on generated types
    .insert(insertData)
    .select()
    .single() as unknown as Promise<{ data: ShareRow | null; error: any }>);

  if (error) {
    if (error.code === "23505") {
      throw new ShareAlreadyExistsError(email);
    }

    console.error("Error creating share:", error);
    throw new Error(`Failed to create share: ${error.message}`);
  }

  if (!data) {
    throw new Error("No data returned from insert operation");
  }

  return rowToShare(data);
}

/**
 * List all shares for an itinerary
 * Only the owner can see all shares (RLS enforced)
 */
export async function listShares(itineraryId: string): Promise<ItineraryShare[]> {
  const { data, error } = await supabase
    .from("itinerary_shares")
    .select("*")
    .eq("itinerary_id", itineraryId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error listing shares:", error);
    throw new Error(`Failed to list shares: ${error.message}`);
  }

  return (data || []).map(rowToShare);
}

/**
 * Update share permission
 * Only the owner can update shares (RLS enforced)
 */
export async function updateSharePermission(
  shareId: string,
  permission: SharePermission,
): Promise<ItineraryShare> {
  const updateData: ShareUpdate = { permission };

  const { data, error } = await (supabase
    .from("itinerary_shares")
    // @ts-ignore - Supabase type inference issue for update payloads on generated types
    .update(updateData)
    .eq("id", shareId)
    .select()
    .single() as unknown as Promise<{ data: ShareRow | null; error: any }>);

  if (error) {
    if (error.code === "PGRST116") {
      throw new ShareNotFoundError(shareId);
    }

    console.error("Error updating share:", error);
    throw new Error(`Failed to update share: ${error.message}`);
  }

  if (!data) {
    throw new ShareNotFoundError(shareId);
  }

  return rowToShare(data);
}

/**
 * Delete a share
 * Only the owner can delete shares (RLS enforced)
 */
export async function deleteShare(shareId: string): Promise<void> {
  const { error } = await supabase.from("itinerary_shares").delete().eq("id", shareId);

  if (error) {
    if (error.code === "PGRST116") {
      throw new ShareNotFoundError(shareId);
    }

    console.error("Error deleting share:", error);
    throw new Error(`Failed to delete share: ${error.message}`);
  }
}

// ============================================================================
// Link Access Operations
// ============================================================================

/**
 * Update itinerary link access level
 * Only the owner can change link access (RLS enforced)
 */
export async function updateLinkAccess(
  itineraryId: string,
  linkAccess: LinkAccess,
): Promise<LinkAccess> {
  const updateData: ItineraryUpdate = { link_access: linkAccess };

  const { error } = await (supabase
    .from("itineraries")
    // @ts-ignore - Supabase type inference issue for update payloads on generated types
    .update(updateData)
    .eq("id", itineraryId) as unknown as Promise<{ error: any }>);

  if (error) {
    console.error("Error updating link access:", error);
    throw new Error(`Failed to update link access: ${error.message}`);
  }

  return linkAccess;
}

// ============================================================================
// Permission Check
// ============================================================================

/**
 * Get the effective permission for the current user on an itinerary
 *
 * Resolution order (union of permissions - highest wins):
 * 1. Owner -> "owner"
 * 2. Collect all permission sources (email share + link access)
 * 3. Return highest permission: owner > edit > view > none
 */
export async function getEffectivePermission(
  itineraryId: string,
  itineraryOwnerId: string,
  linkAccess: LinkAccess,
): Promise<AccessContext> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Check if user is owner
  if (user && user.id === itineraryOwnerId) {
    return { permission: "owner", source: "owner" };
  }

  // 2. Check email-share access first so we preserve whether writes can stay
  // on the normal RLS path instead of routing edit access through RPC.
  let emailSharePermission: EffectivePermission | null = null;
  if (user?.email) {
    const { data: share } = await (supabase
      .from("itinerary_shares")
      .select("permission")
      .eq("itinerary_id", itineraryId)
      .eq("shared_with_email", user.email.toLowerCase())
      .single() as unknown as Promise<{
      data: Pick<ShareRow, "permission"> | null;
      error: any;
    }>);

    if (share?.permission === "edit" || share?.permission === "view") {
      emailSharePermission = share.permission as EffectivePermission;
    }
  }

  // 3. Resolve the highest effective permission while preserving its source.
  if (emailSharePermission === "edit") {
    return { permission: "edit", source: "email_share" };
  }

  if (linkAccess === "edit") {
    return { permission: "edit", source: "link_share" };
  }

  if (emailSharePermission === "view") {
    return { permission: "view", source: "email_share" };
  }

  if (linkAccess === "view") {
    return { permission: "view", source: "link_share" };
  }

  return { permission: "none", source: null };
}
