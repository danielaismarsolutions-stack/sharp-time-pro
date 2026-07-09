import { useState, useEffect, useRef } from 'react';
import { Tag, Loader2, ImagePlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  supabaseServiceCategoriesApi,
  type ServiceCategory,
} from '@/services/supabaseServiceCategories';

interface CategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: ServiceCategory | null;
  onSave: (data: {
    label: string;
    subtitle: string | null;
    isActive: boolean;
  }) => Promise<void>;
  onPhotoChanged?: (categoryId: string, url: string | null) => void;
}

interface FormErrors {
  label?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024;

export default function CategoryModal({
  open,
  onOpenChange,
  category,
  onSave,
  onPhotoChanged,
}: CategoryModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    label: '',
    subtitle: '',
    isActive: true,
  });

  useEffect(() => {
    if (open) {
      setErrors({});
      if (category) {
        setFormData({
          label: category.label,
          subtitle: category.subtitle ?? '',
          isActive: category.isActive,
        });
        setPhotoUrl(category.photoUrl);
      } else {
        setFormData({ label: '', subtitle: '', isActive: true });
        setPhotoUrl(null);
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
      await onSave({
        label: formData.label.trim(),
        subtitle: formData.subtitle.trim() || null,
        isActive: formData.isActive,
      });
    } catch {
      // parent handles toast
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoSelect = async (file: File) => {
    if (!category) {
      toast({
        title: 'Guarda la categoría primero',
        description: 'Necesitas crear la categoría antes de subir la foto.',
      });
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: 'Formato no permitido', description: 'JPG, PNG, WebP o GIF', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_SIZE) {
      toast({ title: 'Imagen muy grande', description: 'Máximo 5MB', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const url = await supabaseServiceCategoriesApi.uploadPhoto(category.id, category.slug, file);
      setPhotoUrl(url);
      onPhotoChanged?.(category.id, url);
      toast({ title: 'Foto de portada actualizada' });
    } catch (err) {
      toast({
        title: 'Error al subir',
        description: err instanceof Error ? err.message : 'Inténtalo de nuevo',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePhotoRemove = async () => {
    if (!category) return;
    setIsUploading(true);
    try {
      await supabaseServiceCategoriesApi.removePhoto(category.id);
      setPhotoUrl(null);
      onPhotoChanged?.(category.id, null);
      toast({ title: 'Foto eliminada' });
    } catch (err) {
      toast({
        title: 'Error al eliminar',
        description: err instanceof Error ? err.message : 'Inténtalo de nuevo',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isLoading && !isUploading && onOpenChange(v)}>
      <DialogContent className="bg-card border-border max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <Tag className="h-4 w-4 text-primary" />
            {category ? 'Editar Categoría' : 'Nueva Categoría'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Cover photo (only when editing existing category) */}
          {category && (
            <div className="space-y-1">
              <Label className="text-xs">Foto de portada</Label>
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'relative w-[120px] h-[120px] rounded-lg border-2 border-dashed',
                    'flex items-center justify-center cursor-pointer overflow-hidden shrink-0',
                    'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
                    isUploading && 'pointer-events-none',
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {photoUrl ? (
                    <>
                      <img src={photoUrl} alt={category.label} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePhotoRemove();
                        }}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-destructive transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      <ImagePlus className="h-6 w-6" />
                      <span className="text-[10px] text-center leading-tight">Subir foto</span>
                    </div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoSelect(file);
                  }}
                />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Aparece en la web cuando un servicio no tiene foto propia.<br />
                  JPG, PNG, WebP o GIF. Máx. 5MB.
                </p>
              </div>
            </div>
          )}

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

          <div className="space-y-1">
            <Label className="text-xs">Subtítulo</Label>
            <Textarea
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              placeholder="Descripción breve para la web pública..."
              rows={2}
              maxLength={200}
              className="text-xs"
            />
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
              disabled={isLoading || isUploading}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" className="text-xs h-8" disabled={isLoading || isUploading}>
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
