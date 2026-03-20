import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.terms" });

  return {
    title: t("title"),
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.terms" });

  return (
    <div className="space-y-8 text-foreground/80">
      <div className="space-y-2 border-b border-border/40 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {t("heading")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("lastUpdated")}</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          {t("section1.title")}
        </h2>

        <div className="space-y-4">
          <p>{t("section1.p1")}</p>

          <div className="space-y-2">
            <h3 className="font-medium text-foreground">
              {t("section1.sub1.title")}
            </h3>
            <p>{t("section1.sub1.content")}</p>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-foreground">
              {t("section1.sub2.title")}
            </h3>
            <p>{t("section1.sub2.content")}</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          {t("section2.title")}
        </h2>
        <p>{t("section2.p1")}</p>
      </section>
    </div>
  );
}
