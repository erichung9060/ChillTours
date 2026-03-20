import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="min-h-screen flex flex-col pt-16">
        <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-12 md:py-20">
          {children}
        </div>
        <Footer />
      </main>
    </>
  );
}
