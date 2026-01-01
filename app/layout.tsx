import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TripAI - AI-Powered Travel Planner",
  description: "Create personalized travel itineraries with AI assistance",
};

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
