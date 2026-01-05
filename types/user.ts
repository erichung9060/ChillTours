import { z } from 'zod';

// ============================================================================
// User Profile Types
// ============================================================================

export const UserTierSchema = z.enum(['free', 'pro']);

export type UserTier = z.infer<typeof UserTierSchema>;

export const UserProfileSchema = z.object({
  id: z.uuid(),
  email: z.string().email(),
  full_name: z.string().nullable(),
  avatar_url: z.string().url().nullable(),
  tier: UserTierSchema,
  credits: z.number().int().min(0),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// ============================================================================
// Theme Preference Types
// ============================================================================

export const ThemeModeSchema = z.enum(['light', 'dark', 'system']);

export type ThemeMode = z.infer<typeof ThemeModeSchema>;

export const ThemePreferenceSchema = z.object({
  mode: ThemeModeSchema,
});

export type ThemePreference = z.infer<typeof ThemePreferenceSchema>;
