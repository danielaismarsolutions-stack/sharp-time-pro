import { useState, useEffect } from 'react';
import { Tag, Loader2 } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { ServiceCategory } from '@/services/supabaseServiceCategories';

interface CategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: ServiceCategory | null;
  onSave: (data: { label: string; isActive: boolean }) => Promise<void>;
}

interface FormErrors {
  label?: string;
}

export default function CategoryModal({
  open,
  onOpenChange,
  category,
  onSave,
}: CategoryModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    label: '',
    isActive: true,
  });

  useEffect(() => {
    if (open) {
      setErrors({});
      if (category) {
        setFormData({ label: category.label, isActive: category.isActive });
      } else {
        setFormData({ label: '', isActive: true });
      }
    }
  }, [category, open]);

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!formData.label.trim()) {
      e.label = 'El nombre es requerido';
    } else if (formData.label.trim().length < 2) {
      e.label = 'Mínimo 2 caracteres';
    } else if (formData.label.trim().length > 50) {
      e.label = 'Máximo 50 caracteres';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) {
      toast({
        title: 'Error de validación',
        description: 'Revisa los campos del formulario',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    try {
      await onSave({ label: formData.label.trim(), isActive: formData.isActive });
    } catch {
      // parent handles toast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isLoading && onOpenChange(v)}>
      <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <Tag className="h-4 w-4 text-primary" />
            {category ? 'Editar Categoría' : 'Nueva Categoría'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Nombre de la categoría *</Label>
            <Input
              value={formData.label}
              onChange={(e) => {
                setFormData({ ...formData, label: e.target.value });
                if (errors.label) setErrors({ ...errors, label: undefined });
              }}
              placeholder="Ej: Mechas, Color, Cortes..."
              className={cn('h-8 text-xs', errors.label && 'border-destructive')}
              maxLength={50}
            />
            {errors.label && (
              <p className="text-[10px] text-destructive">{errors.label}</p>
            )}
            {category && (
              <p className="text-[10px] text-muted-foreground">
                Identificador (slug): <code className="font-mono">{category.slug}</code>
              </p>
            )}
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
            <div>
              <Label className="text-xs">Activa</Label>
              <p className="text-[10px] text-muted-foreground">
                Las inactivas no se ofrecen al asignar servicios
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
              ) : category ? 'Actualizar' : 'Crear Categoría'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
