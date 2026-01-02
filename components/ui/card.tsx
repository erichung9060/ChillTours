import * as React from 'react';
import { cn } from '@/lib/utils/cn';

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-xl border bg-card text-card-foreground',
      // Light mode - very subtle shadow
      'shadow-sm shadow-black/[0.03]',
      'hover:shadow-md hover:shadow-black/[0.05]',
      // Premium dark mode styling
      'dark:bg-gradient-to-br dark:from-card dark:to-card/50',
      'dark:border-border/50',
      'dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)]',
      'dark:backdrop-blur-xl',
      // Hover effects with animation
      'transition-all duration-300 ease-out',
      'dark:hover:shadow-[0_20px_60px_rgb(0,0,0,0.3)]',
      'dark:hover:border-border/80',
      'dark:hover:-translate-y-1',
      'dark:hover:scale-[1.02]',
      // Subtle inner glow
      'dark:before:absolute dark:before:inset-0 dark:before:rounded-xl',
      'dark:before:bg-gradient-to-br dark:before:from-white/[0.03] dark:before:to-transparent',
      'dark:before:pointer-events-none',
      'dark:before:transition-opacity dark:before:duration-300',
      'dark:hover:before:from-white/[0.06]',
      'relative overflow-hidden',
      // Animated gradient on hover
      'dark:after:absolute dark:after:inset-0 dark:after:rounded-xl',
      'dark:after:bg-gradient-to-br dark:after:from-primary/0 dark:after:via-primary/0 dark:after:to-primary/0',
      'dark:after:opacity-0 dark:after:transition-opacity dark:after:duration-500',
      'dark:hover:after:opacity-100 dark:hover:after:from-primary/[0.03] dark:hover:after:to-transparent',
      'dark:after:pointer-events-none',
      className
    )}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6 relative z-10', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-2xl font-semibold leading-none tracking-tight',
      'dark:text-foreground',
      'transition-colors duration-200',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      'text-sm text-muted-foreground',
      'transition-colors duration-200',
      className
    )}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0 relative z-10', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0 relative z-10', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
