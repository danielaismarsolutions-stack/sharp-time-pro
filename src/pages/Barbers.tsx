import { useState, useEffect } from 'react';
import {
  UserPlus,
  Edit2,
  Trash2,
  RefreshCw,
  Calendar,
  Globe,
  User,
  Phone,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useToast } from '@/hooks/use-toast';
import { BarberModal } from '@/components/barbers/BarberModal';
import { Barber, DAYS_ORDER, DAY_LABELS } from '@/types/barber';
import { fetchBarbers, archiveBarber } from '@/services/supabaseBarbers';

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getWorkDays = (barber: Barber): string => {
  if (!barber.schedule) return 'Sin horario';
  
  const enabledDays = DAYS_ORDER.filter(
    (day) => barber.schedule[day]?.enabled
  ).map((day) => DAY_LABELS[day].slice(0, 3));

  if (enabledDays.length === 0) return 'Sin días laborales';
  if (enabledDays.length === 7) return 'Todos los días';
  if (enabledDays.length === 5 && 
      !barber.schedule.saturday?.enabled && 
      !barber.schedule.sunday?.enabled) {
    return 'Lun - Vie';
  }

  return enabledDays.join(', ');
};

export default function Barbers() {
  const { toast } = useToast();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [barberToDelete, setBarberToDelete] = useState<Barber | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadBarbers = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await fetchBarbers();
      setBarbers(data);
    } catch (error) {
      console.error('Error loading barbers:', error);
      toast({
        title: 'Error de conexión',
        description: 'No se pudieron cargar los barberos. Verifica tu internet.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadBarbers();
  }, []);

  const handleAddBarber = () => {
    setSelectedBarber(null);
    setModalOpen(true);
  };

  const handleEditBarber = (barber: Barber) => {
    setSelectedBarber(barber);
    setModalOpen(true);
  };

  const handleDeleteClick = (barber: Barber) => {
    setBarberToDelete(barber);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!barberToDelete) return;

    setIsDeleting(true);
    try {
      await archiveBarber(barberToDelete.id);
      toast({
        title: 'Barbero archivado',
        description: `${barberToDelete.name} ha sido desactivado correctamente`,
      });
      loadBarbers(true);
    } catch (error) {
      console.error('Error archiving barber:', error);
      toast({
        title: 'Error',
        description: 'No se pudo archivar el barbero. Intenta nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setBarberToDelete(null);
    }
  };

  const handleModalSave = () => {
    loadBarbers(true);
  };

  const renderSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Barberos</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl font-bold mt-2">Gestión de Barberos</h1>
          <p className="text-muted-foreground">
            Administra el equipo y sus horarios de trabajo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => loadBarbers(true)}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </Button>
          <Button onClick={handleAddBarber}>
            <UserPlus className="h-4 w-4 mr-2" />
            Añadir Barbero
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{barbers.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <User className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {barbers.filter((b) => b.is_active).length}
                </p>
                <p className="text-sm text-muted-foreground">Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Globe className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {barbers.filter((b) => b.accepts_online_bookings && b.is_active).length}
                </p>
                <p className="text-sm text-muted-foreground">Online</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Calendar className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {barbers.filter((b) => !b.is_active).length}
                </p>
                <p className="text-sm text-muted-foreground">Inactivos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barbers List */}
      {isLoading ? (
        renderSkeleton()
      ) : barbers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay barberos</h3>
            <p className="text-muted-foreground mb-4 text-center">
              Añade tu primer barbero para comenzar a gestionar horarios
            </p>
            <Button onClick={handleAddBarber}>
              <UserPlus className="h-4 w-4 mr-2" />
              Añadir Barbero
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {barbers.map((barber) => (
            <Card
              key={barber.id}
              className={`transition-all hover:shadow-md ${
                !barber.is_active ? 'opacity-60' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={barber.avatar_url || ''} alt={barber.name} />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                      {getInitials(barber.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-lg truncate">
                        {barber.name}
                      </h3>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditBarber(barber)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(barber)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge
                        variant={barber.is_active ? 'default' : 'secondary'}
                        className={
                          barber.is_active
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : ''
                        }
                      >
                        {barber.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                      {barber.accepts_online_bookings && barber.is_active && (
                        <Badge
                          variant="outline"
                          className="bg-blue-500/10 text-blue-400 border-blue-500/30"
                        >
                          <Globe className="h-3 w-3 mr-1" />
                          Online
                        </Badge>
                      )}
                    </div>

                    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {barber.email && (
                        <div className="flex items-center gap-2 truncate">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{barber.email}</span>
                        </div>
                      )}
                      {barber.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span>{barber.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>{getWorkDays(barber)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <BarberModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        barber={selectedBarber}
        onSave={handleModalSave}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Archivar barbero?</AlertDialogTitle>
            <AlertDialogDescription>
              {barberToDelete?.name} será desactivado y no podrá recibir nuevas
              reservas. Las reservas existentes no se verán afectadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Archivando...' : 'Archivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
