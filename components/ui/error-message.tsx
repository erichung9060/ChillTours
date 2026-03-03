import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { useTranslations } from "next-intl";

export interface ErrorMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message: string;
  onRetry?: () => void;
}

const ErrorMessage = React.forwardRef<HTMLDivElement, ErrorMessageProps>(
  ({ className, title, message, onRetry, ...props }, ref) => {
    const t = useTranslations("common");
    const displayTitle = title || t("error");

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border border-destructive/30 bg-destructive/5 p-4",
          "dark:bg-destructive/10 dark:border-destructive/40",
          "backdrop-blur-sm",
          "transition-all duration-300 ease-out",
          // Hover effects
          "hover:border-destructive/50 dark:hover:border-destructive/60",
          // Light mode - subtle shadow
          "hover:shadow-md hover:shadow-destructive/[0.08]",
          // Dark mode - stronger shadow
          "dark:hover:shadow-lg dark:hover:shadow-destructive/10",
          "dark:hover:bg-destructive/[0.15]",
          // Animation on mount
          "animate-in fade-in-0 slide-in-from-top-2 duration-300",
          className
        )}
        role="alert"
        {...props}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div
              className={cn(
                "rounded-lg bg-destructive/10 p-1.5",
                "dark:bg-destructive/20",
                "transition-all duration-200",
                "group-hover:scale-110"
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
                className="text-destructive transition-transform duration-200"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-destructive dark:text-destructive transition-colors duration-200">
              {displayTitle}
            </h3>
            <p className="mt-1 text-sm text-destructive/90 dark:text-destructive/80 transition-colors duration-200">
              {message}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className={cn(
                  "mt-3 text-sm font-medium text-destructive",
                  "hover:text-destructive/80",
                  "underline underline-offset-4",
                  "transition-all duration-200",
                  "hover:translate-x-1",
                  "focus:outline-none focus:ring-2 focus:ring-destructive/50 rounded px-1"
                )}
              >
                {t("retry")} →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);

ErrorMessage.displayName = "ErrorMessage";

export { ErrorMessage };
