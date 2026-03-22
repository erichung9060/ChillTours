"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        className: "border border-border bg-background text-foreground",
        duration: 4000,
      }}
      richColors
      closeButton
    />
  );
}
