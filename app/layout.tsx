import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChillTour",
  description: "AI-Powered Travel Planner",
};

/**
 * Root Layout
 * 
 * This minimal layout only handles routes outside [locale]:
 * - /api/* (API routes)
 * - /auth/callback (OAuth callback)
 * 
 * All user-facing pages are handled by app/[locale]/layout.tsx
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
