import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConfirmActionDialogProps } from '@/hooks/useConfirmAction';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

export function ConfirmActionDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmActionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <AlertDialogContent className="max-w-[360px] sm:max-w-md p-0 overflow-hidden">
        <AlertDialogHeader className="px-5 pt-5 pb-0">
          <AlertDialogTitle className="text-base font-semibold flex items-center gap-2">
            {variant === 'destructive' ? (
              <AlertTriangle className="w-4 h-4 text-destructive" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-primary" />
            )}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="px-5 pb-5 pt-4 flex flex-row gap-3 sm:space-x-0">
          <AlertDialogCancel
            onClick={onCancel}
            className="flex-1 h-11 text-sm font-medium mt-0"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(
              'flex-1 h-11 text-sm font-medium',
              variant === 'destructive'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary hover:bg-primary/90'
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
