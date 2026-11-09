import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

// Champ de la maquette : 46-50 px, rayon 12-14, contour 2, fond Champ, texte 16 px
export const fieldClass =
  'w-full min-h-[48px] rounded-[13px] border-2 border-line bg-field px-3.5 text-base font-semibold text-ink placeholder:text-muted placeholder:font-medium disabled:opacity-50 disabled:cursor-not-allowed';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input type={type} className={cn(fieldClass, className)} ref={ref} {...props} />
));
Input.displayName = 'Input';

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => <select ref={ref} className={cn(fieldClass, 'pr-9', className)} {...props} />
);
Select.displayName = 'Select';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldClass, 'py-3 leading-snug', className)} {...props} />
  )
);
Textarea.displayName = 'Textarea';

interface FieldProps {
  label: React.ReactNode;
  htmlFor: string;
  /** Élément placé à droite du label (ex. « Oublié ? ») */
  aside?: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** Label 13-14 px 700 au-dessus du champ */
function Field({ label, htmlFor, aside, hint, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5 min-w-0', className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[14px] font-bold text-ink">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {hint && <p className="text-[13px] font-semibold text-muted">{hint}</p>}
    </div>
  );
}

/** Champ mot de passe avec bouton œil de 44 px */
const PasswordInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    return (
      <div className="relative">
        <Input ref={ref} type={visible ? 'text' : 'password'} className={cn('pr-14', className)} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          className="absolute right-1 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-lg text-ink hover:bg-surface2"
        >
          {visible ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = 'PasswordInput';

export { Input, Select, Textarea, Field, PasswordInput };
