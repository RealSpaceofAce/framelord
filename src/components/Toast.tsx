// =============================================================================
// TOAST NOTIFICATION COMPONENT
// =============================================================================
// Provides toast notifications with animation and auto-dismiss.
// Includes a global toast manager for triggering from anywhere.
// =============================================================================

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const MotionDiv = motion.div as any;

// =============================================================================
// TYPES
// =============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClick?: () => void;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

// =============================================================================
// GLOBAL TOAST FUNCTION
// =============================================================================

let globalAddToast: ((toast: Omit<Toast, 'id'>) => void) | null = null;

/**
 * Show a toast notification from anywhere in the app.
 * Must be called after ToastProvider is mounted.
 */
export const showToast = (toast: Omit<Toast, 'id'>): void => {
  if (globalAddToast) {
    globalAddToast(toast);
  } else {
    console.warn('[Toast] ToastProvider not mounted. Call showToast after app initialization.');
  }
};

/**
 * Convenience functions for common toast types.
 */
export const toast = {
  success: (title: string, message?: string) => showToast({ type: 'success', title, message }),
  error: (title: string, message?: string) => showToast({ type: 'error', title, message }),
  warning: (title: string, message?: string) => showToast({ type: 'warning', title, message }),
  info: (title: string, message?: string) => showToast({ type: 'info', title, message }),
};

// =============================================================================
// PROVIDER
// =============================================================================

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Register global function
  useEffect(() => {
    globalAddToast = addToast;
    return () => {
      globalAddToast = null;
    };
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

// =============================================================================
// HOOK
// =============================================================================

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// =============================================================================
// TOAST CONTAINER
// =============================================================================

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useContext(ToastContext)!;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};

// =============================================================================
// TOAST ITEM
// =============================================================================

interface ToastItemProps {
  toast: Toast;
  onDismiss: () => void;
}

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} className="text-green-400" />,
  error: <XCircle size={18} className="text-red-400" />,
  warning: <AlertTriangle size={18} className="text-yellow-400" />,
  info: <Info size={18} className="text-blue-400" />,
};

const TOAST_COLORS: Record<ToastType, string> = {
  success: 'border-green-500/30 bg-green-500/10',
  error: 'border-red-500/30 bg-red-500/10',
  warning: 'border-yellow-500/30 bg-yellow-500/10',
  info: 'border-blue-500/30 bg-blue-500/10',
};

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const duration = toast.duration ?? 4000;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  const handleClick = () => {
    if (toast.onClick) {
      toast.onClick();
      onDismiss();
    }
  };

  return (
    <MotionDiv
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      onClick={toast.onClick ? handleClick : undefined}
      className={`pointer-events-auto min-w-[280px] max-w-[380px] rounded-lg border backdrop-blur-md shadow-xl ${TOAST_COLORS[toast.type]} p-4 ${toast.onClick ? 'cursor-pointer hover:brightness-110' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          {TOAST_ICONS[toast.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-white text-sm">{toast.title}</div>
          {toast.message && (
            <div className="text-xs text-gray-400 mt-1">{toast.message}</div>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          className="shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
        >
          <X size={14} className="text-gray-400" />
        </button>
      </div>
    </MotionDiv>
  );
};

export default ToastProvider;
