import { useState, useCallback, useRef } from 'react';

export interface ConfirmActionConfig {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
}

export interface ConfirmActionDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Hook that provides a promise-based confirmation dialog flow.
 *
 * Usage:
 *   const { confirm, dialogProps } = useConfirmAction();
 *
 *   const handleDelete = async () => {
 *     const ok = await confirm({ title: '...', description: '...' });
 *     if (!ok) return;
 *     // proceed with action
 *   };
 *
 *   return <ConfirmActionDialog {...dialogProps} />;
 */
export function useConfirmAction() {
  const [state, setState] = useState<ConfirmActionConfig & { open: boolean }>({
    open: false,
    title: '',
    description: '',
  });

  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((config: ConfirmActionConfig): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ ...config, open: true });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const dialogProps: ConfirmActionDialogProps = {
    open: state.open,
    title: state.title,
    description: state.description,
    confirmLabel: state.confirmLabel,
    cancelLabel: state.cancelLabel,
    variant: state.variant,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
  };

  return { confirm, dialogProps };
}
