import { useState, useEffect } from 'react';
import {
  Plus,
  Scissors,
  Clock,
  DollarSign,
  MoreHorizontal,
  Edit,
  Trash2,
  LayoutGrid,
  List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Service } from '@/types';
import { servicesApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import ServiceModal from '@/components/services/ServiceModal';

export default function Services() {
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    setIsLoading(true);
    try {
      const data = await servicesApi.getAll();
      setServices(data);
    } catch (error) {
      toast({ title: 'Error loading services', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveService = async (serviceData: Partial<Service>) => {
    if (editingService) {
      const updated = await servicesApi.update(editingService.id, serviceData);
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      toast({ title: 'Service updated successfully' });
    } else {
      const created = await servicesApi.create(serviceData as Omit<Service, 'id'>);
      setServices((prev) => [...prev, created]);
      toast({ title: 'Service created successfully' });
    }
    setEditingService(null);
  };

  const handleToggleActive = async (service: Service) => {
    const updated = await servicesApi.update(service.id, { isActive: !service.isActive });
    setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    toast({ title: `Service ${updated.isActive ? 'activated' : 'deactivated'}` });
  };

  const handleDeleteService = async (id: string) => {
    await servicesApi.delete(id);
    setServices((prev) => prev.filter((s) => s.id !== id));
    toast({ title: 'Service deleted' });
  };

  const activeServices = services.filter((s) => s.isActive);
  const inactiveServices = services.filter((s) => !s.isActive);
  const totalRevenuePotential = services.reduce((sum, s) => sum + s.price, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Services</h1>
          <p className="text-muted-foreground text-sm">Manage your service offerings</p>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
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
          <Button onClick={() => { setEditingService(null); setIsModalOpen(true); }} className="h-11 min-h-[44px] flex-1 sm:flex-none">
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>
      </div>

      {/* Stats Cards - 2x2 on mobile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Total Services
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <p className="text-xl md:text-2xl font-bold">{services.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <p className="text-xl md:text-2xl font-bold text-status-success">{activeServices.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Avg. Duration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <p className="text-xl md:text-2xl font-bold">
              {services.length > 0
                ? Math.round(services.reduce((sum, s) => sum + s.duration, 0) / services.length)
                : 0}m
            </p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Avg. Price
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <p className="text-xl md:text-2xl font-bold">
              €{services.length > 0
                ? Math.round(services.reduce((sum, s) => sum + s.price, 0) / services.length)
                : 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Services Grid - always grid on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {services.map((service) => (
          <Card key={service.id} className="border-border relative overflow-hidden touch-manipulation">
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
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive min-h-[44px]"
                      onClick={() => handleDeleteService(service.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
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
                  {service.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <Switch
                  checked={service.isActive}
                  onCheckedChange={() => handleToggleActive(service)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Service Modal */}
      <ServiceModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        service={editingService}
        onSave={handleSaveService}
      />
    </div>
  );
}
