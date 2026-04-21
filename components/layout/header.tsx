"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { useAuth } from "@/hooks/use-auth";
import { LoginDialog } from "@/components/auth/login-dialog";
import { LanguageSelector } from "@/components/ui/language-selector";
import { CreditsBadge } from "@/components/ui/credits-badge";

export function Header() {
  const t = useTranslations("navigation");
  const { user, signOut } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign-out error:", error);
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="h-16 flex items-center justify-between px-4">
          {/* Logo */}
          <Logo />

          {/* Right side - Language selector, theme toggle and auth buttons */}
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <ThemeToggle />
            {user && !user.is_anonymous ? (
              <div className="flex items-center gap-3">
                <Link href="/itineraries">
                  <Button variant="ghost" size="sm">
                    {t("myItineraries")}
                  </Button>
                </Link>
                <CreditsBadge />
                <div className="flex items-center gap-2">
                  {user.user_metadata?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.user_metadata.avatar_url}
                      alt={user.user_metadata?.full_name || "User"}
                      className="w-8 h-8 rounded-full border border-border"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-border">
                      <span className="text-sm font-medium text-primary">
                        {user.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-medium hidden sm:block">
                    {user.user_metadata?.full_name || user.email?.split("@")[0]}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleSignOut()}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t("signOut")}
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => setLoginOpen(true)}>
                {t("logIn")}
              </Button>
            )}
          </div>
        </div>
      </header>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
}
