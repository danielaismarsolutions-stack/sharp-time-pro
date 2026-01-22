import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Barber, CreateBarberData, DEFAULT_SCHEDULE } from '@/types/barber';
import { Loader2 } from 'lucide-react';

interface BarberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barber: Barber | null;
  onSave: (data: CreateBarberData) => Promise<void>;
}

export default function BarberModal({ open, onOpenChange, barber, onSave }: BarberModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (barber) {
      setName(barber.name);
      setEmail(barber.email || '');
      setPhone(barber.phone || '');
      setBio(barber.bio || '');
      setIsActive(barber.is_active);
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setBio('');
      setIsActive(true);
    }
  }, [barber, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        schedule: barber?.schedule || DEFAULT_SCHEDULE,
        is_active: isActive,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{barber ? 'Editar Barbero' : 'Nuevo Barbero'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del barbero"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@ejemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+34 600 000 000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Biografía</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Descripción breve del barbero..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="active">Activo</Label>
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {barber ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
