import { useState, useCallback } from 'react';
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
  Tag,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Service } from '@/types';
import { supabaseServicesApi } from '@/services/supabaseServices';
import { supabaseBarberServicesApi } from '@/services/supabaseBarberServices';
import { useToast } from '@/hooks/use-toast';
import { useServices as useServicesQuery, useBarbers as useBarbersQuery, useInvalidateQuery } from '@/hooks/useQueryHooks';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import { useAuth } from '@/contexts/AuthContext';
import { getBusinessId } from '@/config/session';
import { notifyAllAdmins } from '@/services/supabaseNotifications';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import ServiceModal from '@/components/services/ServiceModal';
import { SortableServiceCard } from '@/components/services/SortableServiceCard';
import { AnimatedCard } from '@/components/ui/animated-card';
import { uploadServicePhoto } from '@/utils/uploadServicePhoto';

export default function Services() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { confirm, dialogProps: confirmDialogProps } = useConfirmAction();
  const { user } = useAuth();
  const { data: queryServices = [], isLoading: isQueryLoading, refetch: refetchServices } = useServicesQuery(true);
  const { data: barbers = [] } = useBarbersQuery(false);
  const { invalidateServices } = useInvalidateQuery();
  const [localServices, setLocalServices] = useState<Service[] | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Use local state for optimistic updates (drag-drop, toggle), fallback to query data
  const services = localServices ?? queryServices;
  const setServices = setLocalServices;
  const isLoading = isQueryLoading && localServices === null;

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
    if (showRefreshing) setIsRefreshing(true);
    await refetchServices();
    setLocalServices(null); // Reset local overrides to use fresh query data
    setIsRefreshing(false);
  }, [refetchServices]);

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

  const handleSaveService = async (serviceData: Partial<Service>, pendingPhotoFile?: File | null) => {
    if (editingService) {
      const confirmed = await confirm({
        title: 'Actualizar servicio',
        description: `¿Confirmar los cambios en el servicio "${serviceData.name || editingService.name}"?`,
        confirmLabel: 'Actualizar',
      });
      if (!confirmed) return;
    }

    try {
      if (editingService) {
        // Update existing service
        await supabaseServicesApi.update(editingService.id, serviceData);

        // Update barber assignments
        if (serviceData.barberIds) {
          await supabaseBarberServicesApi.replaceBarberAssignments(editingService.id, serviceData.barberIds);
        }

        // Notify all admins about service update
        try {
          await notifyAllAdmins({
            business_id: getBusinessId(),
            type: 'service_modified',
            title: 'Servicio modificado',
            message: `${user?.name || 'Usuario'} actualizó el servicio "${serviceData.name || editingService.name}"`,
            metadata: {
              service_id: editingService.id,
              service_name: serviceData.name || editingService.name,
              modified_by: user?.name,
            },
          });
        } catch { /* ignored */ }

        toast({ title: 'Servicio actualizado correctamente' });
      } else {
        // Create new service
        const created = await supabaseServicesApi.create(serviceData as Omit<Service, 'id'>);

        // Assign barbers to the new service
        if (serviceData.barberIds && serviceData.barberIds.length > 0) {
          await supabaseBarberServicesApi.replaceBarberAssignments(created.id, serviceData.barberIds);
        } else {
          await supabaseBarberServicesApi.assignAllActiveBarbers(created.id);
        }

        // Upload pending photo if one was selected during creation
        if (pendingPhotoFile) {
          try {
            const businessId = getBusinessId();
            console.log('[ServicePhoto] Uploading photo for service:', created.id, 'business:', businessId, 'file:', pendingPhotoFile.name, pendingPhotoFile.type, pendingPhotoFile.size);
            const photoUrl = await uploadServicePhoto(pendingPhotoFile, businessId, created.id);
            created.servicePhoto = photoUrl;
          } catch (photoError) {
            console.error('[ServicePhoto] Upload failed:', photoError);
            toast({
              title: 'Servicio creado, pero no se pudo subir la foto',
              description: photoError instanceof Error ? photoError.message : 'Puedes intentar subir la foto editando el servicio',
              variant: 'destructive',
            });
          }
        }

        // Notify all admins about service creation
        try {
          await notifyAllAdmins({
            business_id: getBusinessId(),
            type: 'service_created',
            title: 'Nuevo servicio',
            message: `${user?.name || 'Usuario'} creó el servicio "${serviceData.name}"`,
            metadata: {
              service_id: created.id,
              service_name: serviceData.name,
              created_by: user?.name,
            },
          });
        } catch { /* ignored */ }

        toast({ title: 'Servicio creado correctamente' });
      }
      invalidateServices();
      setLocalServices(null);
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
      (prev ?? queryServices).map((s) => s.id === service.id ? { ...s, isActive: newStatus } : s)
    );

    try {
      await supabaseServicesApi.update(service.id, { isActive: newStatus });

      // Notify all admins about service status change
      try {
        await notifyAllAdmins({
          business_id: getBusinessId(),
          type: 'service_modified',
          title: newStatus ? 'Servicio activado' : 'Servicio desactivado',
          message: `${user?.name || 'Usuario'} ${newStatus ? 'activó' : 'desactivó'} el servicio "${service.name}"`,
          metadata: {
            service_id: service.id,
            service_name: service.name,
            new_status: newStatus ? 'active' : 'inactive',
            modified_by: user?.name,
          },
        });
      } catch { /* ignored */ }

      invalidateServices();
      toast({ title: `Servicio ${newStatus ? 'activado' : 'desactivado'}` });
    } catch (error) {
      // Rollback on error
      setServices((prev) =>
        (prev ?? []).map((s) => s.id === service.id ? { ...s, isActive: !newStatus } : s)
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
    setServices((prev) => (prev ?? queryServices).map((s) => s.id === id ? { ...s, isActive: false } : s));

    try {
      await supabaseServicesApi.delete(id);

      // Notify all admins about service deletion
      try {
        await notifyAllAdmins({
          business_id: getBusinessId(),
          type: 'service_deleted',
          title: 'Servicio desactivado',
          message: `${user?.name || 'Usuario'} desactivó el servicio "${service.name}"`,
          metadata: {
            service_id: id,
            service_name: service.name,
            deleted_by: user?.name,
          },
        });
      } catch { /* ignored */ }

      invalidateServices();
      toast({ title: 'Servicio desactivado' });
    } catch (error) {
      // Rollback
      setServices((prev) => (prev ?? []).map((s) => s.id === id ? { ...s, isActive: true } : s));
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
  const activeNonConsultations = activeServices.filter((s) => !s.isConsultation);
  const avgDuration = activeNonConsultations.length
    ? Math.round(activeNonConsultations.reduce((sum, s) => sum + s.duration, 0) / activeNonConsultations.length)
    : 0;
  const avgPrice = activeNonConsultations.length
    ? Math.round(activeNonConsultations.reduce((sum, s) => sum + s.price, 0) / activeNonConsultations.length)
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
            Gestiona los servicios de tu salón. Arrastra para reordenar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <Button
            variant="outline"
            onClick={() => navigate('/service-categories')}
            className="min-h-[44px]"
          >
            <Tag className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Categorías</span>
            <span className="sm:hidden">Cat.</span>
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
                        {service.servicePhoto ? (
                          <img
                            src={service.servicePhoto}
                            alt={service.name}
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: service.color }}
                          />
                        )}
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
                    <td className="p-4">{service.isConsultation ? '—' : `${service.duration}m`}</td>
                    <td className="p-4">{service.isConsultation ? '—' : `€${service.price}`}</td>
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
        businessId={getBusinessId()}
        barbers={barbers}
        onPhotoChange={(serviceId, photoUrl) => {
          setServices((prev) =>
            (prev ?? queryServices).map((s) => s.id === serviceId ? { ...s, servicePhoto: photoUrl } : s)
          );
          if (editingService?.id === serviceId) {
            setEditingService((prev) => prev ? { ...prev, servicePhoto: photoUrl } : prev);
          }
        }}
      />

      {/* Generic Confirmation Dialog */}
      <ConfirmActionDialog {...confirmDialogProps} />
    </div>
  );
}
