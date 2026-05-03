import { useState, useEffect, useRef } from 'react';
import { Scissors, Clock, DollarSign, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Service } from '@/types';
import { Barber } from '@/types/barber';
import { useToast } from '@/hooks/use-toast';
import ServicePhotoUpload from '@/components/services/ServicePhotoUpload';
import { useServiceCategories } from '@/hooks/useQueryHooks';

interface ServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
  onSave: (service: Partial<Service>, pendingPhotoFile?: File | null) => Promise<void>;
  businessId: string;
  onPhotoChange?: (serviceId: string, photoUrl: string | null) => void;
  barbers?: Barber[];
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
  businessId,
  onPhotoChange,
  barbers = [],
}: ServiceModalProps) {
  const { toast } = useToast();
  const { data: serviceCategories = [] } = useServiceCategories(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [selectedBarberIds, setSelectedBarberIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: 30,
    price: 0,
    color: '#3b82f6',
    isActive: true,
    bufferBefore: 0,
    bufferAfter: 5,
    isConsultation: false,
    category: '' as string,
  });

  useEffect(() => {
    if (open) {
      setErrors({});
      setPendingPhotoFile(null);
      if (localPhotoUrl) URL.revokeObjectURL(localPhotoUrl);
      setLocalPhotoUrl(null);
      const singleCategorySlug = serviceCategories.length === 1 ? serviceCategories[0].slug : '';
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
          isConsultation: service.isConsultation ?? false,
          category: serviceCategories.length <= 1 ? singleCategorySlug : (service.category ?? ''),
        });
        setPriceInput(service.price ? String(service.price) : '');
        setSelectedBarberIds(service.barberIds ?? barbers.map(b => b.id));
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
          isConsultation: false,
          category: singleCategorySlug,
        });
        setPriceInput('');
        setSelectedBarberIds(barbers.map(b => b.id));
      }
    }
  }, [service, open, serviceCategories]);

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
    
    // Validate price and duration only for services (not consultations)
    if (!formData.isConsultation) {
      if (formData.price < 0) {
        newErrors.price = 'El precio debe ser mayor o igual a 0';
      }

      if (!durationOptions.includes(formData.duration)) {
        newErrors.duration = 'Selecciona una duración válida';
      }
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
        duration: formData.isConsultation ? 0 : formData.duration,
        price: formData.isConsultation ? 0 : formData.price,
        color: formData.color,
        isActive: formData.isActive,
        bufferBefore: formData.isConsultation ? 0 : formData.bufferBefore,
        bufferAfter: formData.isConsultation ? 0 : formData.bufferAfter,
        isConsultation: formData.isConsultation,
        barberIds: selectedBarberIds,
        category: formData.category ? formData.category : null,
      }, pendingPhotoFile);
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
          {/* Service Photo */}
          {service ? (
            <ServicePhotoUpload
              serviceId={service.id}
              businessId={businessId}
              currentPhotoUrl={service.servicePhoto ?? null}
              onPhotoChange={(url) => {
                if (onPhotoChange && service) {
                  onPhotoChange(service.id, url);
                }
              }}
            />
          ) : (
            <div className="space-y-1">
              <p className="text-xs font-medium">Foto del servicio</p>
              <div className="flex items-center gap-3">
                <div
                  className={`
                    relative w-[120px] h-[120px] rounded-lg border-2 border-dashed
                    flex items-center justify-center cursor-pointer overflow-hidden
                    transition-all duration-200 shrink-0
                    border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50
                  `}
                  onClick={() => document.getElementById('new-service-photo')?.click()}
                >
                  {localPhotoUrl ? (
                    <img src={localPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      <Scissors className="h-6 w-6" />
                      <span className="text-[10px] text-center leading-tight">Subir foto</span>
                    </div>
                  )}
                </div>
                <input
                  id="new-service-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPendingPhotoFile(file);
                      if (localPhotoUrl) URL.revokeObjectURL(localPhotoUrl);
                      setLocalPhotoUrl(URL.createObjectURL(file));
                    }
                  }}
                />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  JPG, PNG, WebP o GIF.<br />
                  Máximo 5MB. Se subirá al crear.
                </p>
              </div>
            </div>
          )}

          {/* Service Type Selector */}
          <div className="space-y-1">
            <Label className="text-xs">Tipo *</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md border p-2 text-xs font-medium transition-all",
                  !formData.isConsultation
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
                onClick={() => setFormData({ ...formData, isConsultation: false })}
              >
                <Scissors className="h-3.5 w-3.5" />
                Servicio
              </button>
              <button
                type="button"
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md border p-2 text-xs font-medium transition-all",
                  formData.isConsultation
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
                onClick={() => setFormData({ ...formData, isConsultation: true })}
              >
                <Clock className="h-3.5 w-3.5" />
                Consulta
              </button>
            </div>
            {formData.isConsultation && (
              <p className="text-[10px] text-muted-foreground">
                Las consultas no requieren precio ni duración
              </p>
            )}
          </div>

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

          {serviceCategories.length > 1 && (
            <div className="space-y-1">
              <Label className="text-xs">Categoría web</Label>
              <Select
                value={formData.category || 'none'}
                onValueChange={(value) => setFormData({ ...formData, category: value === 'none' ? '' : value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sin categoría —</SelectItem>
                  {serviceCategories.map((cat) => (
                    <SelectItem key={cat.slug} value={cat.slug}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Agrupa el servicio en la web pública. Sin categoría, el servicio no aparece en reservas online.
              </p>
            </div>
          )}

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

          {!formData.isConsultation && (
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
                  type="text"
                  inputMode="decimal"
                  value={priceInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                      setPriceInput(val);
                      setFormData({ ...formData, price: val === '' ? 0 : parseFloat(val) || 0 });
                      if (errors.price) setErrors({ ...errors, price: undefined });
                    }
                  }}
                  placeholder="Ej: 15"
                  className={cn("h-8 text-xs", errors.price && 'border-destructive')}
                />
                {errors.price && (
                  <p className="text-[10px] text-destructive">{errors.price}</p>
                )}
              </div>
            </div>
          )}

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

          {!formData.isConsultation && (
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
          )}

          {/* Barber Assignment */}
          {barbers.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">Estilistas asignados</Label>
              <div className="border rounded-lg p-2 max-h-32 overflow-y-auto space-y-1.5">
                <div className="flex items-center justify-between pb-1 border-b">
                  <span className="text-[10px] text-muted-foreground">
                    {selectedBarberIds.length} de {barbers.length} seleccionados
                  </span>
                  <button
                    type="button"
                    className="text-[10px] text-primary hover:underline"
                    onClick={() =>
                      setSelectedBarberIds(
                        selectedBarberIds.length === barbers.length ? [] : barbers.map(b => b.id)
                      )
                    }
                  >
                    {selectedBarberIds.length === barbers.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </button>
                </div>
                {barbers.map((barber) => (
                  <label key={barber.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedBarberIds.includes(barber.id)}
                      onCheckedChange={(checked) => {
                        setSelectedBarberIds(prev =>
                          checked ? [...prev, barber.id] : prev.filter(id => id !== barber.id)
                        );
                      }}
                    />
                    <span className="text-xs">{barber.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

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