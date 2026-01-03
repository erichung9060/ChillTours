import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          // Base styles
          'inline-flex items-center justify-center rounded-lg font-medium',
          'transition-all duration-200 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          'active:scale-[0.98]',
          'relative overflow-hidden',
          // Hover lift effect
          'hover:-translate-y-0.5',
          // Variant styles
          {
            'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'default',
            
            'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground': variant === 'primary',
            'hover:from-primary/90 hover:to-primary/70': variant === 'primary',
            // Light mode - subtle shadows
            'shadow-md shadow-primary/[0.15] hover:shadow-lg hover:shadow-primary/[0.2]': variant === 'primary',
            // Dark mode - stronger shadows
            'dark:shadow-lg dark:shadow-primary/20 dark:hover:shadow-xl dark:hover:shadow-primary/30': variant === 'primary',
            // Animated shine effect for primary
            'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent': variant === 'primary',
            'before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700': variant === 'primary',
            
            'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
            'dark:bg-secondary/80 dark:hover:bg-secondary': variant === 'secondary',
            'dark:hover:shadow-md': variant === 'secondary',
            
            'bg-gradient-to-br from-destructive to-destructive/80 text-destructive-foreground': variant === 'destructive',
            'hover:from-destructive/90 hover:to-destructive/70': variant === 'destructive',
            // Light mode - subtle shadows
            'shadow-md shadow-destructive/[0.15] hover:shadow-lg hover:shadow-destructive/[0.2]': variant === 'destructive',
            // Dark mode - stronger shadows
            'dark:shadow-lg dark:shadow-destructive/20 dark:hover:shadow-xl dark:hover:shadow-destructive/30': variant === 'destructive',
            
            'border border-input bg-background hover:bg-accent hover:text-accent-foreground': variant === 'outline',
            'dark:border-border/50 dark:hover:border-border dark:hover:bg-accent/50': variant === 'outline',
            'dark:hover:shadow-md dark:hover:shadow-primary/10': variant === 'outline',
            
            'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
            'dark:hover:bg-accent/50': variant === 'ghost',
          },
          // Size styles
          {
            'h-10 px-4 py-2 text-sm': size === 'default',
            'h-9 rounded-md px-3 text-sm': size === 'sm',
            'h-11 rounded-lg px-8 text-base': size === 'lg',
            'h-10 w-10': size === 'icon',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
