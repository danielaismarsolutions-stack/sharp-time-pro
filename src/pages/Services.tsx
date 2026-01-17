import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Clock,
  DollarSign,
  MoreHorizontal,
  Edit,
  Trash2,
  LayoutGrid,
  List,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Service } from '@/types';
import { supabaseServicesApi } from '@/services/supabaseServices';
import { useToast } from '@/hooks/use-toast';
import ServiceModal from '@/components/services/ServiceModal';
import { AnimatedCard } from '@/components/ui/animated-card';

export default function Services() {
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

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
      console.error('Error loading services:', error);
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

  const handleSaveService = async (serviceData: Partial<Service>) => {
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
      console.error('Error saving service:', error);
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
    
    // Optimistic update
    setServices((prev) => prev.map((s) => s.id === id ? { ...s, isActive: false } : s));
    
    try {
      await supabaseServicesApi.delete(id);
      toast({ title: 'Servicio desactivado' });
    } catch (error) {
      // Rollback on error
      setServices((prev) => prev.map((s) => s.id === id ? { ...s, isActive: true } : s));
      toast({ 
        title: 'Error al eliminar servicio', 
        variant: 'destructive' 
      });
    }
  };

  // Calculate stats
  const activeServices = services.filter((s) => s.isActive);
  const avgDuration = services.length > 0
    ? Math.round(services.reduce((sum, s) => sum + s.duration, 0) / services.length)
    : 0;
  const avgPrice = services.length > 0
    ? Math.round(services.reduce((sum, s) => sum + s.price, 0) / services.length)
    : 0;

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-11 w-40" />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border">
              <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border-border">
              <CardHeader className="pb-2 p-4 md:p-6 md:pb-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48 mt-2" />
              </CardHeader>
              <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
                <Skeleton className="h-4 w-24 mb-4" />
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-10" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 md:p-6 space-y-4 md:space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-xl md:text-2xl font-bold">Servicios</h1>
          <p className="text-muted-foreground text-sm">Gestiona tu catálogo de servicios</p>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 md:gap-4"
        >
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'table')} className="hidden sm:block">
            <TabsList>
              <TabsTrigger value="grid" className="min-h-[40px]">
                <LayoutGrid className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="table" className="min-h-[40px]">
                <List className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => loadServices(true)}
            disabled={isRefreshing}
            className="h-11 w-11"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button 
            onClick={() => { setEditingService(null); setIsModalOpen(true); }} 
            className="h-11 min-h-[44px] flex-1 sm:flex-none"
          >
            <Plus className="h-4 w-4 mr-2" />
            Añadir Servicio
          </Button>
        </motion.div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <AnimatedCard delay={0}>
          <Card className="border-border h-full">
            <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Total Servicios
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <p className="text-xl md:text-2xl font-bold">{services.length}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard delay={1}>
          <Card className="border-border h-full">
            <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Activos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <p className="text-xl md:text-2xl font-bold text-status-success">{activeServices.length}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard delay={2}>
          <Card className="border-border h-full">
            <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Duración Prom.
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <p className="text-xl md:text-2xl font-bold">{avgDuration}m</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard delay={3}>
          <Card className="border-border h-full">
            <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Precio Prom.
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <p className="text-xl md:text-2xl font-bold">€{avgPrice}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>

      {/* Services Grid */}
      {services.length === 0 ? (
        <Card className="border-border p-8 text-center">
          <p className="text-muted-foreground mb-4">No hay servicios configurados</p>
          <Button onClick={() => { setEditingService(null); setIsModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Crear primer servicio
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {services.map((service, index) => (
            <AnimatedCard key={service.id} delay={index + 4}>
              <Card className={`border-border relative overflow-hidden touch-manipulation h-full ${!service.isActive ? 'opacity-60' : ''}`}>
                <div
                  className="absolute top-0 left-0 w-1 h-full"
                  style={{ backgroundColor: service.color }}
                />
                <CardHeader className="pb-2 p-4 md:p-6 md:pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base md:text-lg truncate">{service.name}</CardTitle>
                      {service.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 min-h-[44px] min-w-[44px] shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="min-h-[44px]" onClick={() => {
                          setEditingService(service);
                          setIsModalOpen(true);
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive min-h-[44px]"
                          onClick={() => handleDeleteService(service.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Desactivar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {service.duration}m
                      </div>
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <DollarSign className="h-4 w-4" />
                        €{service.price}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant={service.isActive ? 'default' : 'secondary'}>
                      {service.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {togglingId === service.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      <Switch
                        checked={service.isActive}
                        onCheckedChange={() => handleToggleActive(service)}
                        disabled={togglingId === service.id}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          ))}
        </div>
      )}

      {/* Service Modal */}
      <ServiceModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        service={editingService}
        onSave={handleSaveService}
      />
    </motion.div>
  );
}