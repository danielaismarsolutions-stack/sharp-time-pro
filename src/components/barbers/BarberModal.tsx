import { useState, useEffect } from 'react';
import { User, Mail, Phone, Image, FileText, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { ScheduleEditor } from './ScheduleEditor';
import { Barber, NewBarber, WeekSchedule, DEFAULT_SCHEDULE } from '@/types/barber';
import { createBarber, updateBarber } from '@/services/supabaseBarbers';

interface BarberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barber: Barber | null;
  onSave: () => void;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  avatar_url: string;
  bio: string;
  is_active: boolean;
  accepts_online_bookings: boolean;
  schedule: WeekSchedule;
}

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function BarberModal({ open, onOpenChange, barber, onSave }: BarberModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    avatar_url: '',
    bio: '',
    is_active: true,
    accepts_online_bookings: true,
    schedule: DEFAULT_SCHEDULE,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (barber) {
        setFormData({
          name: barber.name,
          email: barber.email || '',
          phone: barber.phone || '',
          avatar_url: barber.avatar_url || '',
          bio: barber.bio || '',
          is_active: barber.is_active,
          accepts_online_bookings: barber.accepts_online_bookings,
          schedule: barber.schedule || DEFAULT_SCHEDULE,
        });
      } else {
        setFormData({
          name: '',
          email: '',
          phone: '',
          avatar_url: '',
          bio: '',
          is_active: true,
          accepts_online_bookings: true,
          schedule: DEFAULT_SCHEDULE,
        });
      }
      setErrors({});
      setActiveTab('info');
    }
  }, [open, barber]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: 'Error de validación',
        description: 'Por favor, corrige los errores en el formulario',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      if (barber) {
        await updateBarber(barber.id, {
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          avatar_url: formData.avatar_url || null,
          bio: formData.bio || null,
          is_active: formData.is_active,
          accepts_online_bookings: formData.accepts_online_bookings,
          schedule: formData.schedule,
        });
        toast({
          title: 'Barbero actualizado',
          description: 'Los cambios se han guardado correctamente',
        });
      } else {
        await createBarber({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          avatar_url: formData.avatar_url || null,
          bio: formData.bio || null,
          is_active: formData.is_active,
          accepts_online_bookings: formData.accepts_online_bookings,
          schedule: formData.schedule,
        });
        toast({
          title: 'Barbero creado',
          description: 'El nuevo barbero se ha añadido correctamente',
        });
      }

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving barber:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el barbero. Intenta nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleScheduleChange = (schedule: WeekSchedule) => {
    setFormData((prev) => ({ ...prev, schedule }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {barber ? 'Editar Barbero' : 'Añadir Barbero'}
          </DialogTitle>
          <DialogDescription>
            {barber
              ? 'Modifica la información y horario del barbero'
              : 'Completa la información del nuevo barbero'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="schedule">Horario</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6 mt-6">
            {/* Avatar Preview */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={formData.avatar_url} alt={formData.name} />
                <AvatarFallback className="text-xl bg-primary/10 text-primary">
                  {formData.name ? getInitials(formData.name) : 'BB'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Label htmlFor="avatar_url" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  URL de Avatar
                </Label>
                <Input
                  id="avatar_url"
                  value={formData.avatar_url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, avatar_url: e.target.value }))
                  }
                  placeholder="https://ejemplo.com/avatar.jpg"
                  className="mt-1.5"
                />
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Nombre del barbero"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="email@ejemplo.com"
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Teléfono
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="+34 600 000 000"
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Biografía
              </Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, bio: e.target.value }))
                }
                placeholder="Breve descripción del barbero..."
                rows={3}
              />
            </div>

            {/* Toggles */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Activo</Label>
                  <p className="text-sm text-muted-foreground">
                    El barbero puede recibir reservas
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_active: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="accepts_online">Reservas Online</Label>
                  <p className="text-sm text-muted-foreground">
                    Visible en el sistema de reservas online
                  </p>
                </div>
                <Switch
                  id="accepts_online"
                  checked={formData.accepts_online_bookings}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      accepts_online_bookings: checked,
                    }))
                  }
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="mt-6">
            <ScheduleEditor
              schedule={formData.schedule}
              onChange={handleScheduleChange}
            />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {barber ? 'Guardar Cambios' : 'Crear Barbero'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
