import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { AuthProvider } from "@/lib/auth/auth-context";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "ChillTour - AI-Powered Travel Planner",
  description: "Create personalized travel itineraries with AI assistance",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Analytics />
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
