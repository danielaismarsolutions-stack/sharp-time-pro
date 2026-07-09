import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface NotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentNotes: string;
  clientName: string;
  onSave: (notes: string) => Promise<void>;
}

export function NotesModal({ open, onOpenChange, currentNotes, clientName, onSave }: NotesModalProps) {
  const [notes, setNotes] = useState(currentNotes);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(notes);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notas - {clientName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="staff-notes" className="text-xs">Notas internas</Label>
            <Textarea
              id="staff-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Añade notas sobre esta consulta..."
              rows={4}
              className="text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="text-xs h-8 min-h-[40px] md:min-h-0" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" className="text-xs h-8 min-h-[40px] md:min-h-0" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
