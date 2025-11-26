import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const ToastContext = createContext(null);
let toastId = 0;

const variants = {
  default: {
    icon: Info,
    container: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100',
    iconColor: 'text-slate-500'
  },
  success: {
    icon: CheckCircle,
    container: 'bg-emerald-50 dark:bg-emerald-600/10 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
    iconColor: 'text-emerald-500'
  },
  destructive: {
    icon: AlertCircle,
    container: 'bg-red-50 dark:bg-red-600/10 border border-red-200 dark:border-red-500/40 text-red-700 dark:text-red-300',
    iconColor: 'text-red-500'
  },
  warning: {
    icon: AlertTriangle,
    container: 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/40 text-amber-700 dark:text-amber-300',
    iconColor: 'text-amber-500'
  }
};

function ToastItem({ id, title, description, variant = 'default', onDismiss }) {
  const config = variants[variant] || variants.default;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'w-full max-w-sm rounded-lg shadow-lg px-4 py-3 transition-all animate-in slide-in-from-bottom-2',
        config.container
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 mt-0.5', config.iconColor)} />
        <div className="flex-1">
          {title && <p className="text-sm font-semibold leading-none mb-1">{title}</p>}
          {description && (
            <p className="text-sm leading-relaxed whitespace-pre-line opacity-90">{description}</p>
          )}
        </div>
        <button
          onClick={() => onDismiss(id)}
          className="rounded-md p-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timeoutsRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    ({ title, description, variant = 'default', duration = 4000 } = {}) => {
      const id = ++toastId;
      setToasts((prev) => [
        ...prev,
        {
          id,
          title,
          description,
          variant
        }
      ]);

      if (duration !== Infinity) {
        const timeout = setTimeout(() => dismiss(id), duration);
        timeoutsRef.current.set(id, timeout);
      }

      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      toast,
      dismiss
    }),
    [toast, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {toasts.map((toastItem) => (
          <ToastItem key={toastItem.id} {...toastItem} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

