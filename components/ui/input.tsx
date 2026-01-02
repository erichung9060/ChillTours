import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2',
            'text-sm ring-offset-background',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-all duration-200 ease-out',
            // Dark mode enhancements with hover
            'dark:bg-input/50 dark:border-border/50',
            'dark:hover:bg-input/70 dark:hover:border-border/70',
            'dark:hover:shadow-md dark:hover:shadow-primary/5',
            'dark:focus-visible:bg-input dark:focus-visible:border-ring/50',
            'dark:focus-visible:shadow-lg dark:focus-visible:shadow-primary/10',
            'dark:focus-visible:translate-y-[-1px]',
            {
              'border-destructive focus-visible:ring-destructive dark:border-destructive dark:focus-visible:border-destructive': error,
              'dark:hover:border-destructive/70': error,
            },
            className
          )}
          ref={ref}
          {...props}
        />
        {helperText && (
          <p
            className={cn(
              'mt-1.5 text-sm transition-colors duration-200',
              error ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
