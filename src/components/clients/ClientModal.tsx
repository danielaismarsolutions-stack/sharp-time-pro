import { useState, useEffect } from 'react';
import { User, Phone, Mail, MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Client } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface ClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSave: (client: Partial<Client>) => Promise<void>;
}

export default function ClientModal({
  open,
  onOpenChange,
  client,
  onSave,
}: ClientModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
  });

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        phone: client.phone,
        email: client.email,
        notes: client.notes || '',
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        notes: '',
      });
    }
  }, [client, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast({
        title: 'Campos incompletos',
        description: 'El nombre y teléfono son obligatorios',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await onSave({
        ...client,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        notes: formData.notes,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el cliente',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {client ? 'Editar Cliente' : 'Nuevo Cliente'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Nombre completo *
            </Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Juan García"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Teléfono *
            </Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+34 612 345 678"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Correo electrónico
            </Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="juan@ejemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Notas
            </Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Preferencias, alergias, solicitudes especiales..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : client ? 'Actualizar' : 'Crear Cliente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
