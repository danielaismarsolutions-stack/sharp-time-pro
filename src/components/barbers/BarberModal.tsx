import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Barber, CreateBarberData, DEFAULT_SCHEDULE } from '@/types/barber';
import { Loader2 } from 'lucide-react';
import AvatarUpload from './AvatarUpload';
import { supabaseStorageApi } from '@/services/supabaseStorage';
import { useToast } from '@/hooks/use-toast';
import { useStaffTerms } from '@/hooks/useStaffTerms';

interface BarberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barber: Barber | null;
  onSave: (data: CreateBarberData, avatarFile?: File | null) => Promise<void>;
}

export default function BarberModal({ open, onOpenChange, barber, onSave }: BarberModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'barber' | 'admin'>('barber');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [deleteAvatar, setDeleteAvatar] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { toast } = useToast();
  const staffTerms = useStaffTerms();

  const isCreating = !barber;

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
      setPassword('');
      setRole('barber');
      setIsActive(true);
    }
    setAvatarFile(null);
    setDeleteAvatar(false);
  }, [barber, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      let avatarUrl = barber?.avatar_url || null;

      // Handle avatar deletion
      if (deleteAvatar && barber?.avatar_url) {
        try {
          await supabaseStorageApi.deleteAvatar(barber.avatar_url);
          avatarUrl = null;
        } catch { /* ignored */ }
      }

      // Handle avatar upload if a new file was selected (only for existing barbers)
      if (avatarFile && barber) {
        setUploadingAvatar(true);
        try {
          if (barber.avatar_url) {
            await supabaseStorageApi.deleteAvatar(barber.avatar_url);
          }
          const result = await supabaseStorageApi.uploadAvatar(avatarFile, barber.id);
          avatarUrl = result.url;
        } catch (uploadError: unknown) {
          toast({
            title: 'Error',
            description: `No se pudo subir la foto, pero el ${staffTerms.singular} se guardará sin ella`,
            variant: 'destructive',
          });
        } finally {
          setUploadingAvatar(false);
        }
      }

      const barberData: CreateBarberData = {
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
        schedule: barber?.schedule || DEFAULT_SCHEDULE,
        is_active: isActive,
        ...(isCreating ? { password, role } : {}),
      };

      // For new barbers with avatar, pass the file to parent to handle upload after creation
      await onSave(barberData, barber ? null : avatarFile);

      onOpenChange(false);
    } catch (error) {
      // Error toast is handled by parent component
    } finally {
      setSaving(false);
      setUploadingAvatar(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{barber ? `Editar ${staffTerms.singularCap}` : `Nuevo ${staffTerms.singularCap}`}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="name" className="text-xs">Nombre *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Nombre del ${staffTerms.singular}`}
              required
              className="h-8 text-xs"
            />
          </div>

          <AvatarUpload
            currentAvatarUrl={deleteAvatar ? null : (barber?.avatar_url || null)}
            onFileSelect={(file) => {
              setAvatarFile(file);
              if (file) setDeleteAvatar(false);
            }}
            onDeleteAvatar={() => setDeleteAvatar(true)}
            disabled={saving || uploadingAvatar}
            barberName={name}
          />

          <div className="space-y-1">
            <Label htmlFor="email" className="text-xs">Email {isCreating && '*'}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@ejemplo.com"
              required={isCreating}
              className="h-8 text-xs"
            />
          </div>

          {isCreating && (
            <div className="space-y-1">
              <Label htmlFor="password" className="text-xs">Contraseña *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                className="h-8 text-xs"
              />
            </div>
          )}

          {isCreating && (
            <div className="space-y-1">
              <Label className="text-xs">Rol</Label>
              <Select value={role} onValueChange={(v) => setRole(v as 'barber' | 'admin')}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="barber">{staffTerms.singularCap}</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="phone" className="text-xs">Teléfono</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+34 600 000 000"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="bio" className="text-xs">Biografía</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={`Descripción breve del ${staffTerms.singular}...`}
              rows={2}
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
            <Label htmlFor="active" className="text-xs">Activo</Label>
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" className="text-xs h-8" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" className="text-xs h-8" disabled={saving || uploadingAvatar || !name.trim() || (isCreating && (!email.trim() || password.length < 6))}>
              {(saving || uploadingAvatar) && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
              {uploadingAvatar ? 'Subiendo...' : barber ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
