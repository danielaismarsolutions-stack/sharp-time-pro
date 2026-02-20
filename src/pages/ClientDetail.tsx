import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Scissors,
  Edit,
  Trash2,
  Plus,
  Clock,
  Tag,
  X,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Client, Booking } from '@/types';
import { supabaseClientsApi, ClientWithBookings } from '@/services/supabaseClients';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import ClientModal from '@/components/clients/ClientModal';

const statusConfig: Record<string, { label: string; class: string }> = {
  pending: { label: 'Pendiente', class: 'bg-yellow-500/20 text-yellow-500' },
  confirmed: { label: 'Confirmada', class: 'bg-violet-500/20 text-violet-500' },
  completed: { label: 'Completada', class: 'bg-green-500/20 text-green-500' },
  cancelled: { label: 'Cancelada', class: 'bg-red-500/20 text-red-500' },
  'no-show': { label: 'No asistió', class: 'bg-gray-500/20 text-gray-500' },
  'no_show': { label: 'No asistió', class: 'bg-gray-500/20 text-gray-500' },
};

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clientData, setClientData] = useState<ClientWithBookings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  useEffect(() => {
    if (id) {
      loadClientData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadClientData = async () => {
    setIsLoading(true);
    try {
      const data = await supabaseClientsApi.getWithBookings(id!);
      if (!data) {
        toast({ title: 'Cliente no encontrado', variant: 'destructive' });
        navigate('/clients');
        return;
      }
      setClientData(data);
    } catch (error) {
      toast({ title: 'Error al cargar cliente', variant: 'destructive' });
      navigate('/clients');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveClient = async (updates: Partial<Client>) => {
    try {
      const updated = await supabaseClientsApi.update(id!, updates);
      setClientData(prev => prev ? { ...prev, ...updated } : null);
      toast({ title: 'Cliente actualizado correctamente' });
    } catch (error) {
      toast({ title: 'Error al actualizar cliente', variant: 'destructive' });
      throw error;
    }
  };

  const handleDeleteClient = async () => {
    try {
      await supabaseClientsApi.delete(id!);
      toast({ title: 'Cliente eliminado' });
      navigate('/clients');
    } catch (error) {
      toast({ title: 'Error al eliminar cliente', variant: 'destructive' });
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim() || !clientData) return;
    
    const updatedTags = [...(clientData.tags || []), newTag.trim()];
    
    try {
      await supabaseClientsApi.updateTags(id!, updatedTags);
      setClientData(prev => prev ? { ...prev, tags: updatedTags } : null);
      setNewTag('');
      setIsAddingTag(false);
      toast({ title: 'Etiqueta añadida' });
    } catch (error) {
      toast({ title: 'Error al añadir etiqueta', variant: 'destructive' });
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!clientData) return;
    
    const updatedTags = (clientData.tags || []).filter(t => t !== tagToRemove);
    
    try {
      await supabaseClientsApi.updateTags(id!, updatedTags);
      setClientData(prev => prev ? { ...prev, tags: updatedTags } : null);
      toast({ title: 'Etiqueta eliminada' });
    } catch (error) {
      toast({ title: 'Error al eliminar etiqueta', variant: 'destructive' });
    }
  };

  // Calculate favorite services from bookings
  const favoriteServices = clientData?.bookings
    .filter((b) => b.status === 'completed')
    .reduce((acc, b) => {
      acc[b.serviceName] = (acc[b.serviceName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

  const sortedServices = Object.entries(favoriteServices)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10" />
          <div className="flex-1">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!clientData) {
    return null;
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 md:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clients')} className="h-10 w-10 min-h-[44px] min-w-[44px]">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold truncate">{clientData.name}</h1>
          <p className="text-muted-foreground text-sm">Perfil del Cliente</p>
        </div>
        <Button 
          variant="outline" 
          size="icon"
          onClick={loadClientData}
          className="h-10 w-10 min-h-[44px] min-w-[44px]"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)} className="h-10 min-h-[44px]">
          <Edit className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Editar</span>
        </Button>
        <Button variant="destructive" size="icon" onClick={handleDeleteClient} className="h-10 w-10 min-h-[44px] min-w-[44px]">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left Column - Client Info */}
        <div className="space-y-6">
          {/* Contact Card */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Información de Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">
                    {clientData.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <a 
                  href={`tel:${clientData.phone}`}
                  className="flex items-center gap-3 hover:text-primary transition-colors"
                >
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{clientData.phone || 'Sin teléfono'}</span>
                </a>
                <a 
                  href={clientData.email ? `mailto:${clientData.email}` : undefined}
                  className={cn(
                    "flex items-center gap-3",
                    clientData.email && "hover:text-primary transition-colors"
                  )}
                >
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{clientData.email || 'Sin email'}</span>
                </a>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Cliente desde {format(new Date(clientData.createdAt), 'MMM yyyy', { locale: es })}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Estadísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Scissors className="h-4 w-4" />
                  <span>Total Visitas</span>
                </div>
                <span className="font-bold">{clientData.totalVisits}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Total Gastado</span>
                </div>
                <span className="font-bold">€{Number(clientData.totalSpent).toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Última Visita</span>
                </div>
                <span className="font-bold">
                  {clientData.lastVisit 
                    ? format(new Date(clientData.lastVisit), 'd MMM', { locale: es }) 
                    : 'Nunca'}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Prom. por Visita</span>
                </div>
                <span className="font-bold">
                  €{clientData.totalVisits > 0 
                    ? Math.round(Number(clientData.totalSpent) / clientData.totalVisits) 
                    : 0}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Favorite Services */}
          {sortedServices.length > 0 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Servicios Favoritos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sortedServices.map(([service, count]) => (
                    <div key={service} className="flex items-center justify-between">
                      <span>{service}</span>
                      <Badge variant="secondary">{count}x</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {clientData.notes && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{clientData.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Etiquetas</CardTitle>
              {!isAddingTag && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setIsAddingTag(true)}
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Añadir
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isAddingTag && (
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Nueva etiqueta..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTag();
                      if (e.key === 'Escape') {
                        setIsAddingTag(false);
                        setNewTag('');
                      }
                    }}
                    className="h-9"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleAddTag} className="h-9">
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      setIsAddingTag(false);
                      setNewTag('');
                    }}
                    className="h-9"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {clientData.tags && clientData.tags.length > 0 ? (
                  clientData.tags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="outline" 
                      className="group cursor-pointer hover:bg-destructive/10"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag}
                      <X className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Badge>
                  ))
                ) : (
                  !isAddingTag && (
                    <p className="text-sm text-muted-foreground">Sin etiquetas</p>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Appointment History */}
        <div className="lg:col-span-2">
          <Card className="border-border h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Historial de Citas ({clientData.bookings.length} visitas)
              </CardTitle>
              <Button size="sm" onClick={() => navigate('/calendar')}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Cita
              </Button>
            </CardHeader>
            <CardContent>
              {clientData.bookings.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Sin citas todavía</p>
                  <Button variant="outline" className="mt-4" onClick={() => navigate('/calendar')}>
                    Reservar Primera Cita
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {clientData.bookings.map((booking) => {
                    const status = statusConfig[booking.status] || { label: booking.status, class: 'bg-muted text-muted-foreground' };
                    return (
                      <div
                        key={booking.id}
                        className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-12 h-12 shrink-0 rounded-lg bg-card flex flex-col items-center justify-center border border-border">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(booking.date), 'MMM', { locale: es })}
                          </span>
                          <span className="font-bold">
                            {format(new Date(booking.date), 'd')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium truncate">{booking.serviceName}</span>
                            <Badge className={cn('text-xs shrink-0', status.class)}>
                              {status.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 md:gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 shrink-0" />
                              {booking.time}
                            </span>
                            <span>{booking.serviceDuration} min</span>
                          </div>
                          {booking.notes && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              Nota: {booking.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold">€{Number(booking.servicePrice).toFixed(2)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Client Modal */}
      <ClientModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        client={clientData}
        onSave={handleSaveClient}
      />
    </div>
  );
}
