import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Loader2, RefreshCw, GripVertical, Pencil, Trash2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useServiceCategories, useInvalidateQuery, useServices } from '@/hooks/useQueryHooks';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import {
  supabaseServiceCategoriesApi,
  type ServiceCategory,
} from '@/services/supabaseServiceCategories';
import CategoryModal from '@/components/services/CategoryModal';
import { AnimatedCard } from '@/components/ui/animated-card';
import { motion } from 'framer-motion';

interface SortableCategoryRowProps {
  category: ServiceCategory;
  serviceCount: number;
  onEdit: (c: ServiceCategory) => void;
  onDelete: (c: ServiceCategory) => void;
}

function SortableCategoryRow({ category, serviceCount, onEdit, onDelete }: SortableCategoryRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1"
              {...attributes}
              {...listeners}
              aria-label="Reordenar"
            >
              <GripVertical className="h-5 w-5" />
            </button>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Tag className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm sm:text-base truncate">{category.label}</h3>
                {!category.isActive && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Inactiva
                  </Badge>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                <code className="font-mono">{category.slug}</code> · {serviceCount} servicio{serviceCount !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3"
                onClick={() => onEdit(category)}
              >
                <Pencil className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(category)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ServiceCategories() {
  const { toast } = useToast();
  const { confirm, dialogProps: confirmDialogProps } = useConfirmAction();
  const { data: queryCategories = [], isLoading, refetch } = useServiceCategories(true);
  const { data: services = [] } = useServices(true);
  const { invalidateServiceCategories, invalidateServices } = useInvalidateQuery();

  const [localCategories, setLocalCategories] = useState<ServiceCategory[] | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);

  const categories = localCategories ?? queryCategories;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const refresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setLocalCategories(null);
    setIsRefreshing(false);
  };

  const countByCategory = (slug: string) =>
    services.filter((s) => s.category === slug).length;

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    const next = arrayMove(categories, oldIndex, newIndex);
    setLocalCategories(next);

    setIsSavingOrder(true);
    try {
      await supabaseServiceCategoriesApi.updateOrder(next.map((c) => c.id));
      toast({ title: 'Orden actualizado' });
      invalidateServiceCategories();
    } catch {
      setLocalCategories(categories);
      toast({ title: 'Error al guardar orden', variant: 'destructive' });
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleSave = async (data: { label: string; isActive: boolean }) => {
    try {
      if (editingCategory) {
        const confirmed = await confirm({
          title: 'Actualizar categoría',
          description: `¿Confirmar los cambios en "${editingCategory.label}"?`,
          confirmLabel: 'Actualizar',
        });
        if (!confirmed) return;

        await supabaseServiceCategoriesApi.update(editingCategory.id, data);
        toast({ title: 'Categoría actualizada' });
      } else {
        await supabaseServiceCategoriesApi.create({ label: data.label });
        toast({ title: 'Categoría creada' });
      }
      invalidateServiceCategories();
      invalidateServices();
      setLocalCategories(null);
      setEditingCategory(null);
      setIsModalOpen(false);
    } catch (err) {
      toast({
        title: 'Error al guardar',
        description: err instanceof Error ? err.message : 'Inténtalo de nuevo',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const handleDelete = async (cat: ServiceCategory) => {
    const used = countByCategory(cat.slug);
    const confirmed = await confirm({
      title: '¿Eliminar categoría?',
      description: used > 0
        ? `Se eliminará "${cat.label}" y los ${used} servicio${used !== 1 ? 's' : ''} asignado${used !== 1 ? 's' : ''} quedarán sin categoría.`
        : `Se eliminará la categoría "${cat.label}". Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      await supabaseServiceCategoriesApi.delete(cat.id);
      toast({ title: 'Categoría eliminada' });
      invalidateServiceCategories();
      invalidateServices();
      setLocalCategories(null);
    } catch (err) {
      toast({
        title: 'Error al eliminar',
        description: err instanceof Error ? err.message : 'Inténtalo de nuevo',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 md:space-y-6 p-3 md:p-6 animate-fade-in">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 md:space-y-6 p-3 md:p-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Categorías</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Organiza tus servicios por categorías para la web pública. Arrastra para reordenar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSavingOrder && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando...
            </div>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={refresh}
            disabled={isRefreshing}
            className="min-h-[44px] min-w-[44px]"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={() => {
              setEditingCategory(null);
              setIsModalOpen(true);
            }}
            className="min-h-[44px]"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Nueva categoría</span>
            <span className="sm:hidden">Añadir</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <AnimatedCard delay={0}>
          <Card className="p-3 md:p-4">
            <div className="text-center">
              <p className="text-xl md:text-2xl font-bold">{categories.length}</p>
              <p className="text-xs md:text-sm text-muted-foreground">Total</p>
            </div>
          </Card>
        </AnimatedCard>
        <AnimatedCard delay={1}>
          <Card className="p-3 md:p-4">
            <div className="text-center">
              <p className="text-xl md:text-2xl font-bold text-green-500">
                {categories.filter((c) => c.isActive).length}
              </p>
              <p className="text-xs md:text-sm text-muted-foreground">Activas</p>
            </div>
          </Card>
        </AnimatedCard>
        <AnimatedCard delay={2}>
          <Card className="p-3 md:p-4">
            <div className="text-center">
              <p className="text-xl md:text-2xl font-bold text-amber-500">
                {services.filter((s) => !s.category).length}
              </p>
              <p className="text-xs md:text-sm text-muted-foreground">Sin categoría</p>
            </div>
          </Card>
        </AnimatedCard>
      </div>

      {/* List */}
      {categories.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Tag className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-1">No hay categorías</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Añade tu primera categoría para empezar a organizar tus servicios
            </p>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear categoría
            </Button>
          </div>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={categories.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {categories.map((cat) => (
                <SortableCategoryRow
                  key={cat.id}
                  category={cat}
                  serviceCount={countByCategory(cat.slug)}
                  onEdit={(c) => {
                    setEditingCategory(c);
                    setIsModalOpen(true);
                  }}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <CategoryModal
        open={isModalOpen}
        onOpenChange={(v) => {
          setIsModalOpen(v);
          if (!v) setEditingCategory(null);
        }}
        category={editingCategory}
        onSave={handleSave}
      />

      <ConfirmActionDialog {...confirmDialogProps} />
    </motion.div>
  );
}
