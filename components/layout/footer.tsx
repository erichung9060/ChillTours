import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";

export function Footer() {
  const t = useTranslations("landing");

  return (
    <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex flex-col items-center justify-center space-y-4">
        <p>{t("footer")}</p>
        <div className="flex items-center justify-center space-x-4 text-xs">
          <Link href="/terms" className="hover:text-foreground transition-colors">
            {t("links.terms")}
          </Link>
          <span className="text-muted-foreground/30">•</span>
          <Link href="/refund" className="hover:text-foreground transition-colors">
            {t("links.refund")}
          </Link>
          <span className="text-muted-foreground/30">•</span>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            {t("links.privacy")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
