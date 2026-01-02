import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <h1 className="text-4xl font-bold">TripAI Travel Planner</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        AI-powered travel planning coming soon...
      </p>
    </main>
  );
}
