import React from 'react';
import { Dialog } from './dialog';
import { Button } from './button';

/**
 * Confirmation dans le style de l'appli, à la place de window.confirm.
 * window.confirm est bloqué ou répond « non » tout seul dans certains navigateurs intégrés
 * et appli installées : l'action était alors annulée sans rien dire.
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: 'Refuser ce compte ?', confirmLabel: 'Refuser', danger: true }))) return;
 */
export interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = React.useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);

  const confirm = React.useCallback<ConfirmFn>(
    (options) => new Promise<boolean>((resolve) => setRequest({ ...options, resolve })),
    []
  );

  const close = (ok: boolean) => {
    request?.resolve(ok);
    setRequest(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {/* Rendue après le reste : passe au-dessus d'une fenêtre déjà ouverte */}
      <Dialog
        isOpen={Boolean(request)}
        onClose={() => close(false)}
        title={request?.title}
        variant="center"
        role="alertdialog"
        tone={request?.danger ? 'danger' : 'default'}
      >
        <div className="flex flex-col gap-4">
          {request?.message && <div className="whitespace-pre-line text-[15px] leading-relaxed">{request.message}</div>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="neutral" onClick={() => close(false)}>
              {request?.cancelLabel || 'Annuler'}
            </Button>
            <Button variant={request?.danger ? 'destructive' : 'primary'} onClick={() => close(true)}>
              {request?.confirmLabel || 'Confirmer'}
            </Button>
          </div>
        </div>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const confirm = React.useContext(ConfirmContext);
  // Sans fournisseur (tests isolés) : repli sur la boîte du navigateur
  return confirm ?? (async (o) => window.confirm(o.title));
}
