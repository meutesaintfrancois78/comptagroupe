import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DialogProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Fenêtre imposée (comptes en attente) : ni Échap, ni clic sur le voile, ni bouton Fermer */
  preventClose?: boolean;
  /** 'sheet' : fenêtre du bas sur téléphone, centrée dès 768 px. 'center' : carte centrée partout (purge, installation). */
  variant?: 'sheet' | 'center';
  /** Ton rouge pour la purge */
  tone?: 'default' | 'danger';
  role?: 'dialog' | 'alertdialog';
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  preventClose = false,
  variant = 'sheet',
  tone = 'default',
  role = 'dialog',
}: DialogProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descId = React.useId();

  // Focus dans la fenêtre à l'ouverture, retour à l'élément d'origine à la fermeture
  React.useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !preventClose && onClose) {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!isOpen) return null;

  const danger = tone === 'danger';
  const sheet = variant === 'sheet';

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-center',
        sheet ? 'items-end md:items-center md:p-6' : 'items-center p-3.5'
      )}
      style={{ background: 'var(--backdrop)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !preventClose && onClose) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full bg-surface text-ink overflow-y-auto outline-none',
          sheet
            ? 'max-h-[92dvh] rounded-t-sheet border-t-2.5 border-line px-5 pt-5 pb-safe md:max-w-[560px] md:rounded-sheet md:border-2.5 md:shadow-pop-md md:pb-5'
            : 'max-w-[440px] max-h-[92dvh] rounded-3xl border-2.5 p-5',
          !sheet && (danger ? 'border-error shadow-pop-red' : 'border-line shadow-pop-md'),
          className
        )}
      >
        {(title || (!preventClose && onClose)) && (
          <div className="mb-4 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              {title && (
                <h2 id={titleId} className={cn('text-[22px] font-extrabold leading-tight', danger && 'text-error')}>
                  {title}
                </h2>
              )}
              {description && (
                <p id={descId} className="mt-1 text-[14px] font-semibold leading-snug text-muted">
                  {description}
                </p>
              )}
            </div>
            {!preventClose && onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-line hover:bg-surface2"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
