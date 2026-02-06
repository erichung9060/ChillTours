import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "default" | "lg";
  text?: string;
}

const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(
  ({ className, size = "default", text, ...props }, ref) => {
    const sizeClasses = {
      sm: "h-4 w-4 border-2",
      default: "h-8 w-8 border-2",
      lg: "h-12 w-12 border-3",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center gap-3",
          "animate-in fade-in-0 zoom-in-95 duration-300",
          className
        )}
        {...props}
      >
        <div className="relative">
          {/* Outer glow ring with pulse */}
          <div
            className={cn(
              "absolute inset-0 rounded-full",
              "dark:bg-primary/20 dark:blur-md",
              "animate-pulse",
              sizeClasses[size]
            )}
          />
          {/* Spinner */}
          <div
            className={cn(
              "relative animate-spin rounded-full",
              "border-primary/30 border-t-primary",
              "dark:border-primary/40 dark:border-t-primary",
              "transition-all duration-300",
              sizeClasses[size]
            )}
            role="status"
            aria-label="Loading"
            style={{
              animationDuration: "0.8s",
            }}
          />
        </div>
        {text && (
          <p
            className={cn(
              "text-sm text-muted-foreground font-medium",
              "animate-pulse",
              "transition-all duration-300"
            )}
          >
            {text}
          </p>
        )}
      </div>
    );
  }
);

Loading.displayName = "Loading";

export { Loading };
