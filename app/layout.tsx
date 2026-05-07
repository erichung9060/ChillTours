import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RiluTrip",
  description: "AI-Powered Travel Planner",
};

/**
 * Root Layout
 *
 * This is the root layout that wraps all routes.
 * The [locale] layout will handle locale-specific configuration.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
