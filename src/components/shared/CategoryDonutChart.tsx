import React from 'react';
import { CategorySlice } from '@/lib/budget';
import { formatCurrency } from '@/lib/utils';

interface CategoryDonutChartProps {
  slices: CategorySlice[];
  totalAmount: number;
  className?: string;
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  slices,
  totalAmount,
  className,
}) => {
  const size = 200;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2; // Rayon au centre du trait
  const circumference = 2 * Math.PI * radius;

  // Si aucune tranche
  if (slices.length === 0 || totalAmount <= 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-4 text-center ${className || ''}`}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgb(var(--divider))"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
          />
        </svg>
        <span className="mt-2 text-[14px] font-bold text-muted">Aucune dépense enregistrée</span>
      </div>
    );
  }

  // Calcul des décalages SVG
  let accumulatedPercent = 0;

  return (
    <div className={`flex flex-col items-center gap-4 ${className || ''}`}>
      {/* Anneau Donut SVG */}
      <div className="relative flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="rotate-[-90deg] transform"
          aria-label={`Répartition des dépenses par catégorie, total : ${formatCurrency(totalAmount)}`}
          role="img"
        >
          {/* Cercle de fond */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgb(var(--divider))"
            strokeWidth={strokeWidth}
          />

          {/* Tranches par catégorie */}
          {slices.map((slice) => {
            const dashLength = (slice.percentage / 100) * circumference;
            const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
            accumulatedPercent += slice.percentage;

            return (
              <circle
                key={slice.categoryId}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLength} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300"
              />
            );
          })}
        </svg>

        {/* Total au centre du Donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
          <span className="text-[12px] font-bold text-muted uppercase tracking-wider">Total</span>
          <span className="text-[19px] font-extrabold text-ink leading-tight">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>

      {/* Légende détaillée */}
      <div className="w-full flex flex-col gap-2 pt-2">
        {slices.map((slice) => (
          <div
            key={slice.categoryId}
            className="flex items-center justify-between gap-3 text-[13px] font-semibold py-1 border-b border-divider/60 last:border-none"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10"
                style={{ backgroundColor: slice.color }}
                aria-hidden="true"
              />
              <span className="truncate text-ink font-bold">{slice.categoryName}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-muted font-bold">{slice.percentage.toFixed(1)} %</span>
              <span className="text-ink font-extrabold">{formatCurrency(slice.amount)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
