import * as React from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type BannerTone = 'warning' | 'error' | 'notice';

/** Bandeaux de la maquette : avertissement (jaune), erreur (role=alert), notification (bleu, role=status) */
export function Banner({
  tone,
  children,
  className,
}: {
  tone: BannerTone;
  children: React.ReactNode;
  className?: string;
}) {
  const styles: Record<BannerTone, string> = {
    warning: 'bg-yellow text-on-color border-2 border-on-color text-[13px] font-semibold',
    error: 'bg-error-bg text-error border-2.5 border-error text-[14px] font-bold',
    notice: 'bg-blue text-on-color border-2 border-on-color text-[14px] font-bold',
  };
  const Icon = tone === 'warning' ? AlertTriangle : tone === 'error' ? XCircle : CheckCircle2;
  return (
    <div
      role={tone === 'error' ? 'alert' : tone === 'notice' ? 'status' : undefined}
      className={cn('flex items-start gap-2.5 rounded-[14px] px-3.5 py-3 leading-snug', styles[tone], className)}
    >
      <Icon className="mt-px h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Interrupteur role=switch, 54 × 32 px */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-8 w-[54px] shrink-0 rounded-2xl border-2 border-line transition-colors disabled:opacity-45',
        checked ? 'bg-green' : 'bg-surface2'
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-[3px] h-[22px] w-[22px] rounded-full border-2 border-on-color bg-white transition-[left]',
          checked ? 'left-[26px]' : 'left-[3px]'
        )}
      />
    </button>
  );
}

/** Barre de progression en 5 segments, avec « Étape N sur 5 » et le nom de l'étape */
export function StepProgress({ step, total, name }: { step: number; total: number; name: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[15px] font-extrabold">
          Étape {step} sur {total}
        </span>
        <span className="text-[14px] font-semibold text-muted">{name}</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step}
        aria-label={`Étape ${step} sur ${total} : ${name}`}
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}
      >
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn('h-3 rounded-md border-2 border-line', i < step ? 'bg-green' : 'bg-surface')}
          />
        ))}
      </div>
    </div>
  );
}

/** Tuile d'icône : contour 2,5 encre sur fond coloré */
export function IconTile({
  children,
  color = 'green',
  size = 50,
  className,
}: {
  children: React.ReactNode;
  color?: 'green' | 'blue' | 'yellow' | 'red' | 'white';
  size?: number;
  className?: string;
}) {
  const bg = { green: 'bg-green', blue: 'bg-blue', yellow: 'bg-yellow', red: 'bg-red', white: 'bg-white' }[color];
  return (
    <span
      aria-hidden="true"
      className={cn('flex shrink-0 items-center justify-center rounded-[14px] border-2.5 border-on-color text-on-color', bg, className)}
      style={{ width: size, height: size }}
    >
      {children}
    </span>
  );
}
