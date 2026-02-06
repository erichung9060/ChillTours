import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void;
}

import { createPortal } from "react-dom";

const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [open, onOpenChange]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Premium backdrop with enhanced blur */}
      <div
        className={cn(
          "fixed inset-0 bg-background/95 backdrop-blur-xl transition-all duration-300",
          "dark:bg-background/80"
        )}
        onClick={() => onOpenChange(false)}
      />
      {/* Content */}
      {children}
    </div>,
    document.body
  );
};

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, onClose, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative z-50 w-full max-w-lg rounded-xl border bg-card p-6",
          // Premium shadows and effects
          // Light mode - subtle shadow
          "shadow-xl shadow-black/[0.08]",
          // Dark mode - stronger shadow
          "dark:shadow-2xl dark:shadow-[0_25px_80px_rgb(0,0,0,0.4)]",
          "dark:bg-gradient-to-br dark:from-card dark:to-card/80",
          "dark:border-border/50",
          // Subtle inner glow
          "dark:before:absolute dark:before:inset-0 dark:before:rounded-xl",
          "dark:before:bg-gradient-to-br dark:before:from-white/[0.05] dark:before:to-transparent",
          "dark:before:pointer-events-none",
          // Animation
          "animate-in",
          className
        )}
        {...props}
      >
        {onClose && (
          <button
            onClick={onClose}
            className={cn(
              "absolute right-4 top-4 rounded-lg p-1.5",
              "opacity-70 ring-offset-background",
              "transition-all duration-200 ease-out",
              "hover:opacity-100 hover:bg-accent hover:scale-110",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "dark:hover:bg-accent/50",
              "active:scale-95"
            )}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-200"
            >
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
            <span className="sr-only">Close</span>
          </button>
        )}
        <div className="relative z-10">{children}</div>
      </div>
    );
  }
);
DialogContent.displayName = "DialogContent";

const DialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
));
DialogHeader.displayName = "DialogHeader";

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

const DialogFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6",
      className
    )}
    {...props}
  />
));
DialogFooter.displayName = "DialogFooter";

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
};
