import { useState, useEffect } from 'react';
import { Scissors, Clock, DollarSign, Loader2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Service } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface ServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
  onSave: (service: Partial<Service>) => Promise<void>;
}

// Duration options based on barbershop needs
const durationOptions = [15, 20, 25, 30, 40, 45, 60, 90];

const colorOptions = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#f97316', // orange
];

interface FormErrors {
  name?: string;
  price?: string;
  duration?: string;
}

export default function ServiceModal({
  open,
  onOpenChange,
  service,
  onSave,
}: ServiceModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: 30,
    price: 0,
    color: '#3b82f6',
    isActive: true,
    bufferBefore: 0,
    bufferAfter: 5,
  });

  useEffect(() => {
    if (open) {
      setErrors({});
      if (service) {
        setFormData({
          name: service.name,
          description: service.description || '',
          duration: service.duration,
          price: service.price,
          color: service.color,
          isActive: service.isActive,
          bufferBefore: service.bufferBefore || 0,
          bufferAfter: service.bufferAfter || 5,
        });
      } else {
        setFormData({
          name: '',
          description: '',
          duration: 30,
          price: 0,
          color: '#3b82f6',
          isActive: true,
          bufferBefore: 0,
          bufferAfter: 5,
        });
      }
    }
  }, [service, open]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'El nombre debe tener al menos 3 caracteres';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'El nombre no puede exceder 100 caracteres';
    }
    
    // Validate price
    if (formData.price < 0) {
      newErrors.price = 'El precio debe ser mayor o igual a 0';
    }
    
    // Validate duration
    if (!durationOptions.includes(formData.duration)) {
      newErrors.duration = 'Selecciona una duración válida';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: 'Error de validación',
        description: 'Por favor, corrige los errores del formulario',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await onSave({
        name: formData.name.trim(),
        description: formData.description.trim(),
        duration: formData.duration,
        price: formData.price,
        color: formData.color,
        isActive: formData.isActive,
        bufferBefore: formData.bufferBefore,
        bufferAfter: formData.bufferAfter,
      });
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !isLoading && onOpenChange(value)}>
      <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <Scissors className="h-4 w-4 text-primary" />
            {service ? 'Editar Servicio' : 'Nuevo Servicio'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Nombre del servicio *</Label>
            <Input
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: undefined });
              }}
              placeholder="Ej: Corte clásico"
              className={cn("h-8 text-xs", errors.name && 'border-destructive')}
              maxLength={100}
            />
            {errors.name && (
              <p className="text-[10px] text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Descripción</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción opcional del servicio..."
              rows={2}
              maxLength={500}
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5 text-xs">
                <Clock className="h-3 w-3" />
                Duración *
              </Label>
              <Select
                value={formData.duration.toString()}
                onValueChange={(value) => {
                  setFormData({ ...formData, duration: parseInt(value) });
                  if (errors.duration) setErrors({ ...errors, duration: undefined });
                }}
              >
                <SelectTrigger className={cn("h-8 text-xs", errors.duration && 'border-destructive')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((d) => (
                    <SelectItem key={d} value={d.toString()}>
                      {d} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.duration && (
                <p className="text-[10px] text-destructive">{errors.duration}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="flex items-center gap-1.5 text-xs">
                <DollarSign className="h-3 w-3" />
                Precio (€) *
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => {
                  setFormData({ ...formData, price: parseFloat(e.target.value) || 0 });
                  if (errors.price) setErrors({ ...errors, price: undefined });
                }}
                className={cn("h-8 text-xs", errors.price && 'border-destructive')}
              />
              {errors.price && (
                <p className="text-[10px] text-destructive">{errors.price}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Color</Label>
            <div className="flex flex-wrap gap-1.5">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    formData.color === color ? 'border-foreground scale-110 ring-1 ring-offset-1 ring-primary' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData({ ...formData, color })}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Buffer antes (min)</Label>
              <Input
                type="number"
                min="0"
                max="60"
                value={formData.bufferBefore}
                onChange={(e) => setFormData({ ...formData, bufferBefore: Math.max(0, parseInt(e.target.value) || 0) })}
                className="h-8 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">Antes de la cita</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Buffer después (min)</Label>
              <Input
                type="number"
                min="0"
                max="60"
                value={formData.bufferAfter}
                onChange={(e) => setFormData({ ...formData, bufferAfter: Math.max(0, parseInt(e.target.value) || 0) })}
                className="h-8 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">Después de la cita</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
            <div>
              <Label className="text-xs">Activo</Label>
              <p className="text-[10px] text-muted-foreground">
                Inactivos no aparecen en reservas
              </p>
            </div>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" className="text-xs h-8" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  Guardando...
                </>
              ) : service ? 'Actualizar' : 'Crear Servicio'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}