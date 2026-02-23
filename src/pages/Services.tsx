import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
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
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  Plus,
  Clock,
  DollarSign,
  LayoutGrid,
  List,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Service } from '@/types';
import { supabaseServicesApi } from '@/services/supabaseServices';
import { useToast } from '@/hooks/use-toast';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import ServiceModal from '@/components/services/ServiceModal';
import { SortableServiceCard } from '@/components/services/SortableServiceCard';
import { AnimatedCard } from '@/components/ui/animated-card';

export default function Services() {
  const { toast } = useToast();
  const { confirm, dialogProps: confirmDialogProps } = useConfirmAction();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadServices = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const data = await supabaseServicesApi.getAll(true);
      setServices(data);
    } catch (error) {
      toast({ 
        title: 'Error al cargar servicios', 
        description: 'Comprueba tu conexión a internet',
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = services.findIndex((s) => s.id === active.id);
      const newIndex = services.findIndex((s) => s.id === over.id);

      const newServices = arrayMove(services, oldIndex, newIndex);
      setServices(newServices);

      // Save the new order to the database
      setIsSavingOrder(true);
      try {
        await supabaseServicesApi.updateOrder(newServices.map(s => s.id));
        toast({ title: 'Orden actualizado' });
      } catch (error) {
        // Rollback on error
        setServices(services);
        toast({ 
          title: 'Error al guardar orden', 
          variant: 'destructive' 
        });
      } finally {
        setIsSavingOrder(false);
      }
    }
  };

  const handleSaveService = async (serviceData: Partial<Service>) => {
    const confirmed = await confirm({
      title: editingService ? 'Actualizar servicio' : 'Crear servicio',
      description: editingService
        ? `¿Confirmar los cambios en el servicio "${serviceData.name || editingService.name}"?`
        : `¿Confirmar la creación del servicio "${serviceData.name}"?`,
      confirmLabel: editingService ? 'Actualizar' : 'Crear',
    });
    if (!confirmed) return;

    try {
      if (editingService) {
        // Update existing service
        const updated = await supabaseServicesApi.update(editingService.id, serviceData);
        setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        toast({ title: 'Servicio actualizado correctamente' });
      } else {
        // Create new service
        const created = await supabaseServicesApi.create(serviceData as Omit<Service, 'id'>);
        setServices((prev) => [...prev, created]);
        toast({ title: 'Servicio creado correctamente' });
      }
      setEditingService(null);
      setIsModalOpen(false);
    } catch (error) {
      toast({
        title: 'Error al guardar servicio',
        description: 'Por favor, inténtalo de nuevo',
        variant: 'destructive'
      });
      throw error; // Re-throw to keep modal open
    }
  };

  const handleToggleActive = async (service: Service) => {
    const newStatus = !service.isActive;

    const confirmed = await confirm({
      title: newStatus ? 'Activar servicio' : 'Desactivar servicio',
      description: newStatus
        ? `¿Activar el servicio "${service.name}"?`
        : `¿Desactivar el servicio "${service.name}"? Los clientes no podrán reservarlo.`,
      confirmLabel: newStatus ? 'Activar' : 'Desactivar',
      variant: newStatus ? 'default' : 'destructive',
    });
    if (!confirmed) return;

    // Optimistic update
    setTogglingId(service.id);
    setServices((prev) =>
      prev.map((s) => s.id === service.id ? { ...s, isActive: newStatus } : s)
    );

    try {
      await supabaseServicesApi.update(service.id, { isActive: newStatus });
      toast({ title: `Servicio ${newStatus ? 'activado' : 'desactivado'}` });
    } catch (error) {
      // Rollback on error
      setServices((prev) =>
        prev.map((s) => s.id === service.id ? { ...s, isActive: !newStatus } : s)
      );
      toast({
        title: 'Error al actualizar estado',
        variant: 'destructive'
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteService = async (id: string) => {
    // Soft delete (set inactive)
    const service = services.find(s => s.id === id);
    if (!service) return;

    const confirmed = await confirm({
      title: '¿Desactivar servicio?',
      description: `Se desactivará el servicio "${service.name}". Los clientes no podrán reservarlo.`,
      confirmLabel: 'Desactivar',
      variant: 'destructive',
    });
    if (!confirmed) return;

    // Optimistic update
    setServices((prev) => prev.map((s) => s.id === id ? { ...s, isActive: false } : s));

    try {
      await supabaseServicesApi.delete(id);
      toast({ title: 'Servicio desactivado' });
    } catch (error) {
      // Rollback
      setServices((prev) => prev.map((s) => s.id === id ? { ...s, isActive: true } : s));
      toast({
        title: 'Error al desactivar servicio',
        variant: 'destructive'
      });
    }
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  // Statistics
  const activeServices = services.filter((s) => s.isActive);
  const avgDuration = activeServices.length
    ? Math.round(activeServices.reduce((sum, s) => sum + s.duration, 0) / activeServices.length)
    : 0;
  const avgPrice = activeServices.length
    ? Math.round(activeServices.reduce((sum, s) => sum + s.price, 0) / activeServices.length)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-4 md:space-y-6 p-3 md:p-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-full sm:w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-3 md:p-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Servicios</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gestiona los servicios de tu barbería. Arrastra para reordenar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSavingOrder && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando...
            </div>
          )}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'table')}>
            <TabsList className="h-10">
              <TabsTrigger value="grid" className="min-h-[44px] min-w-[44px] px-3">
                <LayoutGrid className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="table" className="min-h-[44px] min-w-[44px] px-3">
                <List className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="icon"
            onClick={() => loadServices(true)}
            disabled={isRefreshing}
            className="min-h-[44px] min-w-[44px]"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setIsModalOpen(true)} className="min-h-[44px]">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Añadir Servicio</span>
            <span className="sm:hidden">Añadir</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <AnimatedCard delay={0}>
          <Card className="p-3 md:p-4">
            <div className="text-center">
              <p className="text-xl md:text-2xl font-bold">{services.length}</p>
              <p className="text-xs md:text-sm text-muted-foreground">Total</p>
            </div>
          </Card>
        </AnimatedCard>
        <AnimatedCard delay={1}>
          <Card className="p-3 md:p-4">
            <div className="text-center">
              <p className="text-xl md:text-2xl font-bold text-green-500">{activeServices.length}</p>
              <p className="text-xs md:text-sm text-muted-foreground">Activos</p>
            </div>
          </Card>
        </AnimatedCard>
        <AnimatedCard delay={2}>
          <Card className="p-3 md:p-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 md:gap-2 flex-wrap">
                <span className="flex items-center text-sm md:text-base">
                  <Clock className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                  {avgDuration}m
                </span>
                <span className="text-muted-foreground hidden sm:inline">/</span>
                <span className="flex items-center text-sm md:text-base">
                  <DollarSign className="h-3 w-3 md:h-4 md:w-4" />
                  €{avgPrice}
                </span>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">Media</p>
            </div>
          </Card>
        </AnimatedCard>
      </div>

      {/* Services Grid with Drag and Drop */}
      {viewMode === 'grid' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={services.map(s => s.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {services.map((service) => (
                <SortableServiceCard
                  key={service.id}
                  service={service}
                  togglingId={togglingId}
                  onEdit={handleEditService}
                  onDelete={handleDeleteService}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Servicio</th>
                  <th className="text-left p-4 font-medium">Duración</th>
                  <th className="text-left p-4 font-medium">Precio</th>
                  <th className="text-left p-4 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr 
                    key={service.id} 
                    className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleEditService(service)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: service.color }}
                        />
                        <div>
                          <p className="font-medium">{service.name}</p>
                          {service.description && (
                            <p className="text-sm text-muted-foreground truncate max-w-xs">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">{service.duration}m</td>
                    <td className="p-4">€{service.price}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        service.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}>
                        {service.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Service Modal */}
      <ServiceModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setEditingService(null);
        }}
        onSave={handleSaveService}
        service={editingService}
      />

      {/* Generic Confirmation Dialog */}
      <ConfirmActionDialog {...confirmDialogProps} />
    </div>
  );
}
