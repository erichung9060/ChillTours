"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Globe, Loader2, Lock, Share2, Trash2 } from "lucide-react";
import {
  ShareAlreadyExistsError,
  createShare,
  deleteShare,
  listShares,
  updateLinkAccess,
  updateSharePermission,
} from "@/lib/supabase/shares";
import type { ItineraryShare, LinkAccess, SharePermission } from "@/types/share";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface ShareDialogProps {
  itineraryId: string;
  itineraryTitle: string;
  linkAccess: LinkAccess;
}

const selectClassName =
  "h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-all duration-200 ease-out focus:ring-2 focus:ring-ring";

export function ShareDialog({
  itineraryId,
  itineraryTitle,
  linkAccess: initialLinkAccess,
}: ShareDialogProps) {
  const t = useTranslations("share");
  const [open, setOpen] = useState(false);
  const [linkAccess, setLinkAccess] = useState<LinkAccess>(initialLinkAccess);
  const [shares, setShares] = useState<ItineraryShare[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingShare, setIsAddingShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<SharePermission>("view");

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/plan/${itineraryId}` : "";

  useEffect(() => {
    if (open) {
      void fetchSharesData();
    }
  }, [open]);

  useEffect(() => {
    setLinkAccess(initialLinkAccess);
  }, [initialLinkAccess]);

  async function fetchSharesData() {
    setIsLoading(true);
    try {
      const data = await listShares(itineraryId);
      setShares(data);
    } catch (error) {
      console.error("Failed to fetch shares:", error);
      toast.error(t("loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLinkAccessModeChange(mode: "restricted" | "anyone") {
    setIsSaving(true);
    try {
      const newLinkAccess: LinkAccess =
        mode === "restricted" ? "none" : linkAccess === "edit" ? "edit" : "view";
      await updateLinkAccess(itineraryId, newLinkAccess);
      setLinkAccess(newLinkAccess);
      toast.success(mode === "restricted" ? t("madeRestricted") : t("madePublic"));
    } catch (error) {
      console.error("Failed to update link access:", error);
      toast.error(t("updateFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLinkPermissionChange(newPermission: "view" | "edit") {
    if (linkAccess === "none") {
      return;
    }

    setIsSaving(true);
    try {
      await updateLinkAccess(itineraryId, newPermission);
      setLinkAccess(newPermission);
      toast.success(t("linkPermissionUpdated"));
    } catch (error) {
      console.error("Failed to update link permission:", error);
      toast.error(t("updateFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddShare(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;

    setIsAddingShare(true);
    try {
      const newShare = await createShare(itineraryId, email.trim(), permission);
      setShares((current) => [newShare, ...current]);
      setEmail("");
      toast.success(t("shareAdded"));
    } catch (error) {
      if (error instanceof ShareAlreadyExistsError) {
        toast.error(t("alreadyShared"));
      } else {
        console.error("Failed to add share:", error);
        toast.error(t("addFailed"));
      }
    } finally {
      setIsAddingShare(false);
    }
  }

  async function handleUpdateSharePermission(shareId: string, newPermission: SharePermission) {
    try {
      const updatedShare = await updateSharePermission(shareId, newPermission);
      setShares((current) => current.map((share) => (share.id === shareId ? updatedShare : share)));
      toast.success(t("permissionUpdated"));
    } catch (error) {
      console.error("Failed to update permission:", error);
      toast.error(t("updateFailed"));
    }
  }

  async function handleRemoveShare(shareId: string) {
    try {
      await deleteShare(shareId);
      setShares((current) => current.filter((share) => share.id !== shareId));
      toast.success(t("shareRemoved"));
    } catch (error) {
      console.error("Failed to remove share:", error);
      toast.error(t("removeFailed"));
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(t("linkCopied"));
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
      toast.error(t("copyFailed"));
    }
  }

  const isAnyoneMode = linkAccess !== "none";

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Share2 className="mr-2 h-4 w-4" />
        {t("share")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg" onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>{t("shareTitle", { title: itineraryTitle })}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-6">
            <section className="space-y-3">
              <div>
                <p className="text-sm font-medium">{t("generalAccess")}</p>
                <p className="text-xs text-muted-foreground">{t("generalAccessDescription")}</p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => void handleLinkAccessModeChange("restricted")}
                  disabled={isSaving}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                    !isAnyoneMode ? "border-primary bg-primary/5" : "hover:bg-accent/50",
                  )}
                >
                  <Lock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">{t("restricted")}</div>
                    <p className="text-sm text-muted-foreground">{t("restrictedDescription")}</p>
                  </div>
                </button>

                <div
                  className={cn(
                    "rounded-lg border p-3 transition-colors",
                    isAnyoneMode ? "border-primary bg-primary/5" : "hover:bg-accent/50",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => void handleLinkAccessModeChange("anyone")}
                    disabled={isSaving}
                    className="flex w-full items-start gap-3 text-left"
                  >
                    <Globe className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium">{t("anyoneWithLink")}</div>
                      <p className="text-sm text-muted-foreground">
                        {t("anyoneWithLinkDescription")}
                      </p>
                    </div>
                  </button>

                  {isAnyoneMode && (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <label htmlFor="link-permission" className="text-sm font-medium">
                        {t("linkPermission")}
                      </label>
                      <select
                        id="link-permission"
                        value={linkAccess}
                        onChange={(e) =>
                          void handleLinkPermissionChange(e.target.value as "view" | "edit")
                        }
                        disabled={isSaving}
                        className={cn(selectClassName, "sm:w-40")}
                      >
                        <option value="view">{t("canView")}</option>
                        <option value="edit">{t("canEdit")}</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {isAnyoneMode && (
                <div className="flex gap-2">
                  <Input value={shareUrl} readOnly className="text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => void handleCopyLink()}
                    aria-label={t("copyLink")}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </section>

            <section className="space-y-3 border-t pt-4">
              <div>
                <p className="text-sm font-medium">{t("addPeople")}</p>
                <p className="text-xs text-muted-foreground">{t("addPeopleDescription")}</p>
              </div>

              <form onSubmit={handleAddShare} className="space-y-2">
                <Input
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div className="flex gap-2">
                  <select
                    value={permission}
                    onChange={(e) => setPermission(e.target.value as SharePermission)}
                    className={cn(selectClassName, "w-32")}
                  >
                    <option value="view">{t("canView")}</option>
                    <option value="edit">{t("canEdit")}</option>
                  </select>
                  <Button
                    type="submit"
                    disabled={isAddingShare || !email.trim()}
                    isLoading={isAddingShare}
                    loadingText={t("adding")}
                    className="flex-1"
                  >
                    {t("add")}
                  </Button>
                </div>
              </form>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{t("peopleWithAccess")}</p>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>

              {shares.length > 0 ? (
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {shares.map((share) => (
                    <div key={share.id} className="flex items-center gap-2 rounded-md bg-muted p-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{share.shared_with_email}</p>
                      </div>
                      <select
                        value={share.permission}
                        onChange={(e) =>
                          void handleUpdateSharePermission(
                            share.id,
                            e.target.value as SharePermission,
                          )
                        }
                        className={cn(selectClassName, "w-28")}
                      >
                        <option value="view">{t("canView")}</option>
                        <option value="edit">{t("canEdit")}</option>
                      </select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void handleRemoveShare(share.id)}
                        aria-label={t("removePerson")}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("noPeopleYet")}</p>
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
