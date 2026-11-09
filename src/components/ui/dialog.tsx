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
  preventClose?: boolean;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  preventClose = false,
}: DialogProps) {
  React.useEffect(() => {
    if (!isOpen || preventClose || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, preventClose, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !preventClose && onClose) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          'relative w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl border border-border max-h-[90vh] overflow-y-auto',
          className
        )}
      >
        {!preventClose && onClose && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        {(title || description) && (
          <div className="mb-4 space-y-1 pr-8">
            {title && <h2 className="text-xl font-bold text-foreground">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
