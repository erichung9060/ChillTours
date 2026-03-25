"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubscriptionDialog({
  open,
  onOpenChange,
}: SubscriptionDialogProps) {
  const t = useTranslations("subscription");

  const handleUpgrade = () => {
    toast.info(t("comingSoon"), {
      duration: 3000,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* Credit Usage Info */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span>💳</span>
              {t("creditUsage.title")}
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {t("creditUsage.generateItinerary")}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {t("creditUsage.chat")}
              </li>
            </ul>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Free Plan Card */}
            <div className="rounded-xl border bg-card p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className="space-y-4 flex-1">
                <h3 className="text-xl font-bold">{t("plans.free.title")}</h3>
                <div>
                  <p className="text-3xl font-bold">{t("plans.free.price")}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("plans.free.credits")}
                  </p>
                </div>
              </div>
              <Button
                disabled
                className="w-full mt-6 h-12"
                variant="outline"
                aria-label={t("plans.free.cta")}
              >
                {t("plans.free.cta")}
              </Button>
            </div>

            {/* Pro Plan Card */}
            <div className="relative rounded-xl p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border-2 border-transparent bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 before:absolute before:inset-0 before:rounded-xl before:p-[2px] before:bg-gradient-to-br before:from-purple-500 before:to-blue-500 before:-z-10 before:m-[-2px] animate-in fade-in slide-in-from-bottom-4">
              {/* Recommended Badge */}
              <div className="absolute -top-3 right-6">
                <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                  🔥 {t("plans.pro.badge")}
                </span>
              </div>

              <div className="space-y-4 flex-1">
                <h3 className="text-xl font-bold">{t("plans.pro.title")}</h3>
                <div>
                  <p className="text-3xl font-bold">
                    {t("plans.pro.pricing.monthly")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("plans.pro.pricing.annual")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t("plans.pro.credits")}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleUpgrade}
                className="w-full mt-6 h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold shadow-lg transition-transform hover:scale-105"
                aria-label={t("plans.pro.cta")}
              >
                {t("plans.pro.cta")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
