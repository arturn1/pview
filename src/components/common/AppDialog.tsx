import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';

interface DialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm?: () => void;
}

const DialogContext = createContext<((options: DialogOptions) => void) | null>(null);

function Dialog({ options, onDismiss }: { options: DialogOptions; onDismiss: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="app-dialog-title"
      aria-describedby="app-dialog-message"
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      className="w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-900/40"
    >
      <div className="p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-rose-50 p-2 text-rose-600">
            {options.onConfirm ? <AlertTriangle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          </div>
          <div>
            <h2 id="app-dialog-title" className="text-sm font-bold text-slate-900">{options.title}</h2>
            <p id="app-dialog-message" className="mt-1 text-sm leading-relaxed text-slate-600">{options.message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          {options.onConfirm && (
            <button type="button" onClick={onDismiss} autoFocus className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
              Cancelar
            </button>
          )}
          <button
            type="button"
            autoFocus={!options.onConfirm}
            onClick={() => {
              onDismiss();
              options.onConfirm?.();
            }}
            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700"
          >
            {options.confirmLabel || 'Entendi'}
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogOptions | null>(null);

  return (
    <DialogContext.Provider value={setDialog}>
      {children}
      {dialog && <Dialog options={dialog} onDismiss={() => setDialog(null)} />}
    </DialogContext.Provider>
  );
}

export function useAppDialog() {
  const showDialog = useContext(DialogContext);
  if (!showDialog) throw new Error('useAppDialog deve ser usado dentro de AppDialogProvider');
  return showDialog;
}
