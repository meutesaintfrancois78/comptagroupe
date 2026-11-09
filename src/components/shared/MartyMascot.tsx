import React from 'react';
import { cn } from '@/lib/utils';

export type MartyExpression = 'hello' | 'waiting' | 'ready' | 'success' | 'offline' | 'error';

type CircleColor = 'green' | 'blue' | 'red' | 'surface2';

interface MartyMascotProps {
  expression: MartyExpression;
  /** Diamètre du cercle en px (maquette : 52, 80, 100, 124, 132) */
  size?: number;
  circle?: CircleColor;
  /** Ombre décalée de 4 ou 6 px, ou aucune */
  shadow?: 0 | 4 | 6;
  alt?: string;
  /** Pastille posée en haut à droite du cercle (réveil, cadenas, wifi barré…) */
  badge?: React.ReactNode;
  className?: string;
}

const circleClass: Record<CircleColor, string> = {
  green: 'bg-green',
  blue: 'bg-blue',
  red: 'bg-red',
  surface2: 'bg-surface2',
};

const altByExpression: Record<MartyExpression, string> = {
  hello: 'Marty, le bison, qui salue',
  waiting: 'Marty, le bison, avec un réveil',
  ready: 'Marty, le bison',
  success: 'Marty, le bison, tout content',
  offline: 'Marty, le bison, hors ligne',
  error: 'Marty, le bison, embêté',
};

/**
 * Marty dans son cercle coloré (contour 2,5 px). Seul endroit où l'illustration est choisie :
 * remplacer une pose = changer l'image dans public/marty/.
 */
export const MartyMascot: React.FC<MartyMascotProps> = ({
  expression,
  size = 100,
  circle = 'green',
  shadow = 0,
  alt,
  badge,
  className,
}) => (
  <div
    className={cn(
      'relative shrink-0 rounded-full border-2.5 border-line',
      circleClass[circle],
      shadow === 4 && 'shadow-pop',
      shadow === 6 && 'shadow-pop-lg',
      className
    )}
    style={{ width: size, height: size }}
  >
    <picture>
      <source srcSet={`/marty/marty-${expression}.webp`} type="image/webp" />
      <img
        src={`/marty/marty-${expression}.png`}
        alt={alt ?? altByExpression[expression]}
        className="h-full w-full select-none rounded-full object-contain p-[8%]"
        draggable={false}
      />
    </picture>
    {badge && <div className="absolute -right-1.5 -top-1.5">{badge}</div>}
  </div>
);
