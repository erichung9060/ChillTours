import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.privacy" });

  return {
    title: t("title"),
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.privacy" });

  return (
    <div className="space-y-8 text-foreground/80">
      <div className="space-y-2 border-b border-border/40 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("heading")}</h1>
        <p className="text-sm text-muted-foreground">{t("lastUpdated")}</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">{t("section1.title")}</h2>

        <p>{t("section1.p1")}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">{t("section2.title")}</h2>

        <p>{t("section2.p1")}</p>
      </section>
    </div>
  );
}
