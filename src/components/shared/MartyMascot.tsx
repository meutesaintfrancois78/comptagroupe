import React from 'react';
import { cn } from '@/lib/utils';

export type MartyExpression = 'hello' | 'waiting' | 'ready' | 'success' | 'offline' | 'error';

interface MartyMascotProps {
  expression: MartyExpression;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  title?: string;
  subtitle?: string;
}

const sizeClasses = {
  sm: 'w-20 h-20',
  md: 'w-32 h-32',
  lg: 'w-44 h-44',
  xl: 'w-56 h-56',
};

export const MartyMascot: React.FC<MartyMascotProps> = ({
  expression,
  className,
  size = 'md',
  title,
  subtitle,
}) => {
  // Chemin de l'image WebP ou PNG (servies depuis public/)
  const imagePath = `/marty/marty-${expression}.webp`;
  const pngFallback = `/marty/marty-${expression}.png`;

  return (
    <div className={cn('flex flex-col items-center justify-center text-center p-4', className)}>
      <div className={cn('relative transition-transform hover:scale-105 active:scale-95 duration-300', sizeClasses[size])}>
        <picture>
          <source srcSet={imagePath} type="image/webp" />
          <img
            src={pngFallback}
            alt={`Marty le bison - expression ${expression}`}
            className="w-full h-full object-contain filter drop-shadow-md select-none"
            onError={(e) => {
              // Si l'image locale met du temps ou n'est pas encore prête, fallback SVG inline
              const target = e.currentTarget;
              target.style.display = 'none';
              const parent = target.parentElement?.parentElement;
              if (parent) {
                const fallback = parent.querySelector('.marty-svg-fallback') as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }
            }}
          />
        </picture>
        {/* Fallback SVG ultra-propre si les images IA ne sont pas encore chargées */}
        <div className="marty-svg-fallback hidden w-full h-full items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 border-2 border-emerald-600/30">
          <span className="text-4xl" role="img" aria-label="Bison">🦬</span>
        </div>
      </div>
      {title && (
        <h3 className="mt-3 text-lg font-bold text-foreground">
          {title}
        </h3>
      )}
      {subtitle && (
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">
          {subtitle}
        </p>
      )}
    </div>
  );
};
