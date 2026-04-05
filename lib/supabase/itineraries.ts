/**
 * Itinerary Data Layer
 *
 * This module provides database operations for itineraries.
 * Handles CRUD operations with proper error handling and RLS enforcement.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { supabase } from "./client";
import type { Itinerary } from "@/types/itinerary";
import type { Database } from "./database.types";

type Json = Database["public"]["Tables"]["itineraries"]["Row"]["data"];
type ItineraryRow = Database["public"]["Tables"]["itineraries"]["Row"];
type ItineraryInsert = Database["public"]["Tables"]["itineraries"]["Insert"];
type ItineraryUpdate = Database["public"]["Tables"]["itineraries"]["Update"];
type ItineraryStatus = Itinerary["status"];

/**
 * Error thrown when free tier limit is reached
 */
export class FreeTierLimitError extends Error {
  constructor() {
    super("Free tier users can only create 3 itineraries");
    this.name = "FreeTierLimitError";
  }
}

/**
 * Error thrown when itinerary is not found
 */
export class ItineraryNotFoundError extends Error {
  constructor(id: string) {
    super(`Itinerary with id ${id} not found`);
    this.name = "ItineraryNotFoundError";
  }
}

function isNoRowError(error: any): boolean {
  return error?.code === "PGRST116";
}

/**
 * Convert database row to Itinerary type
 */
function rowToItinerary(row: ItineraryRow): Itinerary {
  const data = row.data as any;

  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    destination: row.destination,
    start_date: row.start_date,
    end_date: row.end_date,
    preferences: row.preferences || undefined,
    status: row.status as ItineraryStatus,
    days: data?.days || [],
    link_access: row.link_access,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function loadPublicItineraryViaRpc(id: string): Promise<Itinerary> {
  const { data, error } = await (supabase
    .rpc("get_public_itinerary", { p_id: id })
    .single() as unknown as Promise<{ data: ItineraryRow | null; error: any }>);

  if (error) {
    if (isNoRowError(error)) {
      throw new ItineraryNotFoundError(id);
    }

    console.error("Error loading public itinerary via RPC:", error);
    throw new Error(`Failed to load public itinerary: ${error.message}`);
  }

  if (!data) {
    throw new ItineraryNotFoundError(id);
  }

  return rowToItinerary(data);
}

async function updatePublicItineraryViaRpc(
  id: string,
  updateData: ItineraryUpdate
): Promise<Itinerary> {
  const { data, error } = await (supabase
    .rpc("update_public_itinerary", {
      p_id: id,
      p_updates: updateData,
    })
    .single() as unknown as Promise<{ data: ItineraryRow | null; error: any }>);

  if (error) {
    if (isNoRowError(error)) {
      throw new ItineraryNotFoundError(id);
    }

    console.error("Error updating public itinerary via RPC:", error);
    throw new Error(`Failed to update public itinerary: ${error.message}`);
  }

  if (!data) {
    throw new ItineraryNotFoundError(id);
  }

  return rowToItinerary(data);
}

/**
 * Convert Itinerary to database insert format
 */
function itineraryToInsert(
  itinerary: Omit<Itinerary, "id" | "created_at" | "updated_at">
): Database["public"]["Tables"]["itineraries"]["Insert"] {
  return {
    user_id: itinerary.user_id,
    title: itinerary.title,
    destination: itinerary.destination,
    start_date: itinerary.start_date,
    end_date: itinerary.end_date,
    preferences: itinerary.preferences || null,
    data: {
      days: itinerary.days,
    } as Json,
  };
}

/**
 * Create itinerary metadata only (without days/activities)
 * Used for "metadata-first" creation flow
 *
 * @param metadata - The itinerary metadata to save
 * @returns The created itinerary with empty days array
 * @throws FreeTierLimitError if user has reached free tier limit
 * @throws Error if save fails
 */
export async function createItineraryMetadata(metadata: {
  user_id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  preferences?: string;
}): Promise<Itinerary> {
  const insertData: ItineraryInsert = {
    user_id: metadata.user_id,
    title: metadata.title,
    destination: metadata.destination,
    start_date: metadata.start_date,
    end_date: metadata.end_date,
    preferences: metadata.preferences || null,
  };

  const { data, error } = await (supabase
    .from("itineraries")
    // @ts-ignore - Supabase type inference issue with complex Json types
    .insert(insertData)
    .select()
    .single() as unknown as Promise<{ data: ItineraryRow | null; error: any }>);

  if (error) {
    // Check if it's a free tier limit error
    if (
      error.message.includes("Free tier users can only create 3 itineraries")
    ) {
      throw new FreeTierLimitError();
    }

    console.error("Error creating itinerary metadata:", error);
    throw new Error(`Failed to create itinerary metadata: ${error.message}`);
  }

  if (!data) {
    throw new Error("No data returned from insert operation");
  }

  return rowToItinerary(data);
}

/**
 * Save an itinerary to the database
 *
 * Requirements: 10.1, 10.2
 *
 * @param itinerary - The itinerary to save (without id, created_at, updated_at)
 * @returns The saved itinerary with generated id and timestamps
 * @throws FreeTierLimitError if user has reached free tier limit
 * @throws Error if save fails
 */
export async function saveItinerary(
  itinerary: Omit<Itinerary, "id" | "created_at" | "updated_at">
): Promise<Itinerary> {
  const insertData: ItineraryInsert = itineraryToInsert(itinerary);

  const { data, error } = await (supabase
    .from("itineraries")
    // @ts-ignore - Supabase type inference issue with complex Json types
    .insert(insertData)
    .select()
    .single() as unknown as Promise<{ data: ItineraryRow | null; error: any }>);

  if (error) {
    // Check if it's a free tier limit error
    if (
      error.message.includes("Free tier users can only create 3 itineraries")
    ) {
      throw new FreeTierLimitError();
    }

    console.error("Error saving itinerary:", error);
    throw new Error(`Failed to save itinerary: ${error.message}`);
  }

  if (!data) {
    throw new Error("No data returned from insert operation");
  }

  return rowToItinerary(data);
}

/**
 * Load an itinerary from the database by ID
 *
 * Requirements: 10.3
 *
 * @param id - The itinerary ID
 * @returns The loaded itinerary
 * @throws ItineraryNotFoundError if itinerary doesn't exist or user doesn't have access
 * @throws Error if load fails
 */
export async function loadItinerary(id: string): Promise<Itinerary> {
  const { data, error } = await supabase
    .from("itineraries")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (isNoRowError(error)) {
      // Row not found or RLS policy violation. Public link access falls back to
      // the SECURITY DEFINER RPC which requires the exact itinerary UUID.
      return loadPublicItineraryViaRpc(id);
    }

    console.error("Error loading itinerary:", error);
    throw new Error(`Failed to load itinerary: ${error.message}`);
  }

  if (!data) {
    throw new ItineraryNotFoundError(id);
  }

  return rowToItinerary(data);
}

/**
 * Update an existing itinerary
 *
 * @param id - The itinerary ID
 * @param updates - Partial itinerary data to update
 * @returns The updated itinerary
 * @throws ItineraryNotFoundError if itinerary doesn't exist or user doesn't have access
 * @throws Error if update fails
 */
export async function updateItinerary(
  id: string,
  updates: Partial<
    Omit<Itinerary, "id" | "user_id" | "created_at" | "updated_at">
  >
): Promise<Itinerary> {
  const updateData: ItineraryUpdate = {};

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.destination !== undefined)
    updateData.destination = updates.destination;
  if (updates.start_date !== undefined)
    updateData.start_date = updates.start_date;
  if (updates.end_date !== undefined) updateData.end_date = updates.end_date;
  if (updates.preferences !== undefined)
    updateData.preferences = updates.preferences || null;

  if (updates.days !== undefined) {
    updateData.data = {
      days: updates.days,
    } as Json;
  }

  const { data, error } = await (supabase
    .from("itineraries")
    // @ts-ignore - Supabase type inference issue with complex Json types
    .update(updateData)
    .eq("id", id)
    .select()
    .single() as unknown as Promise<{ data: ItineraryRow | null; error: any }>);

  if (error) {
    if (isNoRowError(error)) {
      return updatePublicItineraryViaRpc(id, updateData);
    }

    console.error("Error updating itinerary:", error);
    throw new Error(`Failed to update itinerary: ${error.message}`);
  }

  if (!data) {
    throw new ItineraryNotFoundError(id);
  }

  return rowToItinerary(data);
}

/**
 * Delete an itinerary from the database
 *
 * Requirements: 10.4
 *
 * @param id - The itinerary ID to delete
 * @throws ItineraryNotFoundError if itinerary doesn't exist or user doesn't have access
 * @throws Error if delete fails
 */
export async function deleteItinerary(id: string): Promise<void> {
  const { error } = await supabase.from("itineraries").delete().eq("id", id);

  if (error) {
    if (error.code === "PGRST116") {
      throw new ItineraryNotFoundError(id);
    }

    console.error("Error deleting itinerary:", error);
    throw new Error(`Failed to delete itinerary: ${error.message}`);
  }
}

/**
 * List summary information for a user's itineraries
 */
export interface ItinerarySummary {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

/**
 * List all itineraries for the current user
 *
 * Requirements: 10.5
 *
 * @returns Array of itinerary summaries with destination and date information
 * @throws Error if list fails
 */
export async function listUserItineraries(): Promise<ItinerarySummary[]> {
  const { data, error } = await supabase
    .from("itineraries")
    .select(
      "id, title, destination, start_date, end_date, created_at, updated_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error listing itineraries:", error);
    throw new Error(`Failed to list itineraries: ${error.message}`);
  }

  return data || [];
}

/**
 * Get the count of itineraries for the current user
 * Useful for checking free tier limits
 *
 * Requirements: 10.2
 *
 * @returns The number of itineraries the user has
 */
export async function getItineraryCount(): Promise<number> {
  const { count, error } = await supabase
    .from("itineraries")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error counting itineraries:", error);
    throw new Error(`Failed to count itineraries: ${error.message}`);
  }

  return count || 0;
}
