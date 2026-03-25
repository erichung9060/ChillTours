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
import { CreditCard, Sparkles, Check, Zap } from "lucide-react";

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
        className="max-w-4xl p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-2xl"
      >
        <div className="p-8 sm:p-10 max-h-[90vh] overflow-y-auto w-full">
          <DialogHeader className="mb-8 text-center sm:text-left">
            <DialogTitle className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              {t("title")}
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              {t("description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-8">
            {/* Credit Usage Info - Glassmorphism */}
            <div className="relative overflow-hidden rounded-2xl border bg-muted/30 p-5 md:p-6 backdrop-blur-md">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
              <div className="relative flex flex-col md:flex-row md:items-center gap-4 md:gap-6 text-foreground">
                <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div className="flex-1 space-y-3">
                  <h3 className="text-lg font-semibold">
                    {t("creditUsage.title")}
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-sm text-foreground/80">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500/10 text-green-500">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="font-medium">
                        {t("creditUsage.generateItinerary")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500/10 text-green-500">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="font-medium">
                        {t("creditUsage.chat")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Cards Grid */}
            <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
              {/* Free Plan Card */}
              <div className="relative group rounded-3xl border bg-card/40 p-8 flex flex-col backdrop-blur-sm transition-all duration-500 hover:shadow-xl hover:bg-card/60">
                <div className="space-y-6 flex-1">
                  <div className="inline-flex px-4 py-1.5 rounded-full bg-secondary/50 text-secondary-foreground text-sm font-semibold tracking-wide">
                    {t("plans.free.title")}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-extrabold tracking-tight">
                        {t("plans.free.price")}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-3 font-medium">
                      {t("plans.free.credits")}
                    </p>
                  </div>
                </div>

                <Button
                  disabled
                  className="w-full mt-8 h-14 rounded-xl text-base font-semibold bg-muted/50 text-muted-foreground cursor-not-allowed"
                  variant="outline"
                  aria-label={t("plans.free.cta")}
                >
                  {t("plans.free.cta")}
                </Button>
              </div>

              {/* Pro Plan Card */}
              <div className="relative group rounded-3xl p-8 flex flex-col transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 bg-card border border-primary/20 cursor-pointer overflow-hidden isolate">
                {/* Animated Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-fuchsia-500/5 to-orange-500/5 opacity-100 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-fuchsia-500/20 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl" />

                {/* Glowing Border effect */}
                <div className="absolute inset-0 rounded-3xl border border-primary/30 group-hover:border-primary/50 transition-colors duration-500 -z-10" />

                {/* Recommended Badge */}
                <div className="absolute -top-[1px] inset-x-0 flex justify-center z-10">
                  <div className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-b-xl shadow-md flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    {t("plans.pro.badge")}
                  </div>
                </div>

                <div className="space-y-6 flex-1 mt-3">
                  <div className="inline-flex px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold tracking-wide">
                    {t("plans.pro.title")}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-x-2 gap-y-1 flex-wrap">
                      <span className="text-5xl font-extrabold tracking-tight bg-gradient-to-b from-foreground to-foreground/80 bg-clip-text text-transparent">
                        {t("plans.pro.pricing.monthly")}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      {t("plans.pro.pricing.annual")}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-border/50">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-amber-500/10 p-1">
                        <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                      </div>
                      <p className="font-medium text-foreground leading-relaxed">
                        {t("plans.pro.credits")}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleUpgrade}
                  className="w-full mt-8 h-14 text-base rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 hover:from-violet-500 hover:via-fuchsia-500 hover:to-orange-400 text-white font-bold shadow-lg shadow-violet-500/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  aria-label={t("plans.pro.cta")}
                >
                  {t("plans.pro.cta")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
