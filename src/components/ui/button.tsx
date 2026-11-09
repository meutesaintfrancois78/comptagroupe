import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Boutons de la maquette : contour 2,5 px, rayon 16, ombre décalée sans flou
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-extrabold transition-transform select-none disabled:pointer-events-none disabled:opacity-45 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
  {
    variants: {
      variant: {
        primary: 'bg-green text-on-color border-2.5 border-line shadow-pop hover:brightness-105',
        secondary: 'bg-blue text-on-color border-2.5 border-line shadow-pop hover:brightness-105',
        neutral: 'bg-surface text-ink border-2.5 border-line hover:bg-surface2',
        destructive: 'bg-surface text-error border-2.5 border-error hover:bg-error-bg',
        purge: 'bg-red text-on-color border-2.5 border-on-color',
        icon: 'bg-transparent text-ink border-2 border-line hover:bg-surface2',
        link: 'bg-transparent text-link underline underline-offset-4 decoration-2 px-0 shadow-none active:translate-x-0 active:translate-y-0',
        // Anciens noms, ramenés sur les nouveaux styles
        default: 'bg-green text-on-color border-2.5 border-line shadow-pop hover:brightness-105',
        scout: 'bg-green text-on-color border-2.5 border-line shadow-pop hover:brightness-105',
        outline: 'bg-surface text-ink border-2.5 border-line hover:bg-surface2',
        ghost: 'bg-transparent text-ink hover:bg-surface2',
      },
      size: {
        default: 'min-h-[52px] px-5 rounded-xl text-base',
        lg: 'min-h-[54px] px-6 rounded-xl text-[17px]',
        sm: 'min-h-[40px] px-3 rounded-lg text-sm',
        icon: 'h-11 w-11 min-w-[44px] rounded-lg p-0',
        link: 'min-h-[32px] text-sm font-bold',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, type = 'button', ...props }, ref) => {
    const resolvedSize = size ?? (variant === 'link' ? 'link' : variant === 'icon' ? 'icon' : 'default');
    return (
      <button
        type={type}
        className={cn(buttonVariants({ variant, size: resolvedSize, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
