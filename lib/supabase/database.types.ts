/**
 * Database Type Definitions
 *
 * These types are generated from the Supabase database schema.
 * They provide type safety for all database operations.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          tier: "free" | "pro";
          credits: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          tier?: "free" | "pro";
          credits?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          tier?: "free" | "pro";
          credits?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      itineraries: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          destination: string;
          start_date: string;
          end_date: string;
          requirements: string | null;
          status: "draft" | "generating" | "completed" | "failed";
          data: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          destination: string;
          start_date: string;
          end_date: string;
          requirements?: string | null;
          status?: "draft" | "generating" | "completed" | "failed";
          data?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          destination?: string;
          start_date?: string;
          end_date?: string;
          requirements?: string | null;
          status?: "draft" | "generating" | "completed" | "failed";
          data?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      itinerary_shares: {
        Row: {
          id: string;
          itinerary_id: string;
          shared_with_email: string;
          permission: "view" | "edit";
          created_at: string;
        };
        Insert: {
          id?: string;
          itinerary_id: string;
          shared_with_email: string;
          permission?: "view" | "edit";
          created_at?: string;
        };
        Update: {
          id?: string;
          itinerary_id?: string;
          shared_with_email?: string;
          permission?: "view" | "edit";
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
