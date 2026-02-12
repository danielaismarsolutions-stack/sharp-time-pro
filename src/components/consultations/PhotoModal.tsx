import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { X } from 'lucide-react';

interface PhotoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photoUrl: string;
  clientName: string;
}

export function PhotoModal({ open, onOpenChange, photoUrl, clientName }: PhotoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="p-3 pb-0">
          <DialogTitle>Foto de {clientName}</DialogTitle>
        </DialogHeader>
        <div className="p-3">
          <img
            src={photoUrl}
            alt={`Foto de consulta de ${clientName}`}
            className="w-full h-auto max-h-[60vh] object-contain rounded-lg"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
