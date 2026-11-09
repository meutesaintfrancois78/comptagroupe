import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Pastilles de la maquette : rayon 999, contour 2 px encre, 12-13 px 800.
// La couleur ne porte jamais le sens seule : chaque pastille contient un mot.
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border-2 border-on-color px-2.5 py-0.5 text-[12px] font-extrabold leading-5 text-on-color whitespace-nowrap',
  {
    variants: {
      variant: {
        green: 'bg-green',
        blue: 'bg-blue',
        yellow: 'bg-yellow',
        red: 'bg-red',
        neutral: 'bg-surface2 text-ink border-line',
        dashed: 'bg-transparent text-ink border-line border-dashed',
        // Anciens noms
        default: 'bg-green',
        success: 'bg-green',
        secondary: 'bg-blue',
        warning: 'bg-yellow',
        destructive: 'bg-red',
        outline: 'bg-surface2 text-ink border-line',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
