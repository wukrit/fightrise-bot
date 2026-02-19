import React from 'react';

/**
 * Generate a unique ID for toast notifications.
 * Uses crypto.randomUUID() if available, falls back to a compatible method.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  // Uses timestamp + random hex to ensure uniqueness
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}`;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const toastStyles: Record<ToastType, React.CSSProperties> = {
  success: {
    borderLeft: '4px solid #22c55e',
    backgroundColor: '#f0fdf4',
  },
  error: {
    borderLeft: '4px solid #ef4444',
    backgroundColor: '#fef2f2',
  },
  warning: {
    borderLeft: '4px solid #f59e0b',
    backgroundColor: '#fffbeb',
  },
  info: {
    borderLeft: '4px solid #3b82f6',
    backgroundColor: '#eff6ff',
  },
};

const iconPaths: Record<ToastType, string> = {
  success: 'M20 6L9 17l-5-5',
  error: 'M18 6L6 18M6 6l12 12',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

const containerStyles: React.CSSProperties = {
  position: 'fixed',
  bottom: '24px',
  right: '24px',
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  maxWidth: '400px',
};

const toastBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '12px',
  padding: '16px',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  animation: 'slideInRight 0.2s ease',
};

const iconStyles: React.CSSProperties = {
  flexShrink: 0,
  width: '20px',
  height: '20px',
};

const contentStyles: React.CSSProperties = {
  flex: 1,
  fontSize: '14px',
  lineHeight: 1.5,
};

const closeButtonStyles: React.CSSProperties = {
  flexShrink: 0,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '4px',
  borderRadius: '4px',
  color: '#6b7280',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const timeoutIdsRef = React.useRef<Set<NodeJS.Timeout>>(new Set());

  const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = generateId();
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      const timeoutId = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timeoutIdsRef.current.delete(timeoutId);
      }, duration);
      timeoutIdsRef.current.add(timeoutId);
    }
  }, []);

  // Cleanup all timeouts on unmount to prevent memory leaks
  React.useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      timeoutIdsRef.current.clear();
    };
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div style={containerStyles}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const iconColors: Record<ToastType, string> = {
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  };

  return (
    <div style={{ ...toastBase, ...toastStyles[toast.type] }}>
      <svg style={iconStyles} viewBox="0 0 24 24" fill="none" stroke={iconColors[toast.type]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={iconPaths[toast.type]} />
      </svg>
      <p style={contentStyles}>{toast.message}</p>
      <button style={closeButtonStyles} onClick={() => onRemove(toast.id)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// Standalone toast function for use outside provider
let toastFn: ((toast: Omit<Toast, 'id'>) => void) | null = null;

export function setToastFunction(fn: (toast: Omit<Toast, 'id'>) => void) {
  toastFn = fn;
}

export function toast(message: string, type: ToastType = 'info', duration?: number) {
  if (toastFn) {
    toastFn({ message, type, duration });
  }
}
