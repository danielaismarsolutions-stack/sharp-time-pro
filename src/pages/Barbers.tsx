import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Barber, CreateBarberData, BarberSchedule, TimeOff } from '@/types/barber';
import { supabaseBarbersApi } from '@/services/supabaseBarbers';
import { supabaseStorageApi } from '@/services/supabaseStorage';
import { supabase } from '@/lib/supabase';
import { getBusinessId } from '@/config/session';
import { useAuth } from '@/contexts/AuthContext';
import { createNotification } from '@/services/supabaseNotifications';
import BarberCard from '@/components/barbers/BarberCard';
import BarberModal from '@/components/barbers/BarberModal';
import ScheduleEditor from '@/components/barbers/ScheduleEditor';
import TimeOffManager from '@/components/barbers/TimeOffManager';
import { useToast } from '@/hooks/use-toast';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Plus,
  Search,
  Loader2,
  Users,
  ArrowLeft,
  Filter,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { motion, AnimatePresence } from 'framer-motion';

export default function Barbers() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [scheduleSheetOpen, setScheduleSheetOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();
  const { confirm, dialogProps: confirmDialogProps } = useConfirmAction();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const loadBarbers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await supabaseBarbersApi.getAll(showInactive);
      // Sort so "Rioja" always appears first
      data.sort((a, b) => {
        if (a.name.toLowerCase() === 'rioja') return -1;
        if (b.name.toLowerCase() === 'rioja') return 1;
        return a.name.localeCompare(b.name);
      });
      setBarbers(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los barberos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [showInactive, toast]);

  useEffect(() => {
    loadBarbers();
  }, [loadBarbers]);

  // Realtime subscription: reload barbers when users table changes for this business
  const loadBarbersRef = useRef(loadBarbers);
  loadBarbersRef.current = loadBarbers;

  useEffect(() => {
    let businessId: string;
    try {
      businessId = getBusinessId();
    } catch {
      return;
    }

    const channelName = `barbers-sync-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users', filter: `business_id=eq.${businessId}` },
        () => {
          loadBarbersRef.current();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredBarbers = barbers.filter((barber) =>
    barber.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    barber.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    barber.phone?.includes(searchQuery)
  );

  const handleSaveBarber = async (data: CreateBarberData, avatarFile?: File | null) => {
    if (selectedBarber) {
      const confirmed = await confirm({
        title: 'Actualizar barbero',
        description: `¿Confirmar los cambios en el barbero "${data.name}"?`,
        confirmLabel: 'Actualizar',
      });
      if (!confirmed) return;
    }

    try {
      if (selectedBarber) {
        // Updating existing barber - avatar already handled in modal
        await supabaseBarbersApi.update(selectedBarber.id, data);

        // Create notification for barber update
        if (user?.id) {
          try {
            await createNotification({
              user_id: user.id,
              business_id: getBusinessId(),
              type: 'barber_modified',
              title: 'Barbero modificado',
              message: `${user.name} actualizó el perfil de ${data.name}`,
              metadata: {
                barber_id: selectedBarber.id,
                barber_name: data.name,
                modified_by: user.name,
              },
            });
          } catch { /* ignored */ }
        }

        toast({ title: 'Barbero actualizado' });
      } else {
        // Creating new barber
        const newBarber = await supabaseBarbersApi.create(data);

        // If there's an avatar file, upload it now
        if (avatarFile) {
          try {
            const result = await supabaseStorageApi.uploadAvatar(avatarFile, newBarber.id);
            await supabaseBarbersApi.updateAvatarUrl(newBarber.id, result.url);
          } catch (uploadError) {
            toast({
              title: 'Advertencia',
              description: 'Barbero creado, pero no se pudo subir la foto',
            });
          }
        }

        // Create notification for barber creation
        if (user?.id) {
          try {
            await createNotification({
              user_id: user.id,
              business_id: getBusinessId(),
              type: 'barber_created',
              title: 'Nuevo barbero',
              message: `${user.name} creó el barbero "${data.name}"`,
              metadata: {
                barber_id: newBarber.id,
                barber_name: data.name,
                created_by: user.name,
              },
            });
          } catch { /* ignored */ }
        }

        toast({ title: 'Barbero creado' });
      }
      await loadBarbers();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el barbero',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleSaveSchedule = async (schedule: BarberSchedule) => {
    if (!editingBarber) return;

    const confirmed = await confirm({
      title: 'Actualizar horario',
      description: `¿Confirmar los cambios en el horario de ${editingBarber.name}?`,
      confirmLabel: 'Guardar',
    });
    if (!confirmed) return;

    try {
      await supabaseBarbersApi.updateSchedule(editingBarber.id, schedule);

      // Create notification for schedule update
      if (user?.id) {
        try {
          await createNotification({
            user_id: user.id,
            business_id: getBusinessId(),
            type: 'schedule_modified',
            title: 'Horario modificado',
            message: `${user.name} actualizó el horario de ${editingBarber.name}`,
            metadata: {
              barber_id: editingBarber.id,
              barber_name: editingBarber.name,
              modified_by: user.name,
            },
          });
        } catch { /* ignored */ }
      }

      toast({ title: 'Horario actualizado' });
      await loadBarbers();
      setEditingBarber((prev) => prev ? { ...prev, schedule } : null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el horario',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleSaveTimeOff = async (timeOff: TimeOff[]) => {
    if (!editingBarber) return;

    const confirmed = await confirm({
      title: 'Actualizar días libres',
      description: `¿Confirmar los cambios en los días libres de ${editingBarber.name}?`,
      confirmLabel: 'Guardar',
    });
    if (!confirmed) return;

    try {
      await supabaseBarbersApi.updateTimeOff(editingBarber.id, timeOff);

      // Create notification for time off update
      if (user?.id) {
        try {
          await createNotification({
            user_id: user.id,
            business_id: getBusinessId(),
            type: 'time_off_modified',
            title: 'Días libres modificados',
            message: `${user.name} actualizó los días libres de ${editingBarber.name}`,
            metadata: {
              barber_id: editingBarber.id,
              barber_name: editingBarber.name,
              modified_by: user.name,
            },
          });
        } catch { /* ignored */ }
      }

      toast({ title: 'Días libres actualizados' });
      await loadBarbers();
      setEditingBarber((prev) => prev ? { ...prev, time_off: timeOff } : null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron guardar los días libres',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const openEditModal = (barber: Barber) => {
    setSelectedBarber(barber);
    setModalOpen(true);
  };

  const openNewModal = () => {
    setSelectedBarber(null);
    setModalOpen(true);
  };

  const openScheduleSheet = (barber: Barber) => {
    setEditingBarber(barber);
    setScheduleSheetOpen(true);
  };

  // Schedule content - shared between Sheet and Drawer
  const ScheduleContent = () => (
    <div className="space-y-6 pb-8">
      {editingBarber && (
        <>
          <ScheduleEditor
            schedule={editingBarber.schedule}
            onSave={handleSaveSchedule}
          />
          <TimeOffManager
            timeOff={editingBarber.time_off}
            onSave={handleSaveTimeOff}
          />
        </>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh] px-4 sm:px-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-16 sm:pb-6">
      {/* Header - Compact on mobile */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 sm:h-6 sm:w-6" />
            Barberos
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestiona tu equipo y sus horarios
          </p>
        </div>
        <Button 
          onClick={openNewModal} 
          className="w-full sm:w-auto h-11 sm:h-10 text-base sm:text-sm font-medium"
        >
          <Plus className="h-5 w-5 sm:h-4 sm:w-4 mr-2" />
          Nuevo Barbero
        </Button>
      </div>

      {/* Search & Filters - Mobile optimized */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            {/* Search with filter toggle on mobile */}
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar barbero..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-11 sm:h-10 text-base sm:text-sm"
                />
              </div>
              {/* Mobile filter toggle */}
              <Button 
                variant={showFilters ? "secondary" : "outline"}
                size="icon"
                className="h-11 w-11 sm:hidden flex-shrink-0"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-5 w-5" />
              </Button>
            </div>

            {/* Filters - Collapsible on mobile */}
            <AnimatePresence>
              {(showFilters || !isMobile) && (
                <motion.div
                  initial={isMobile ? { height: 0, opacity: 0 } : false}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={isMobile ? { height: 0, opacity: 0 } : undefined}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-3 pt-2 sm:pt-0">
                    <Switch
                      id="show-inactive"
                      checked={showInactive}
                      onCheckedChange={setShowInactive}
                    />
                    <Label htmlFor="show-inactive" className="text-sm cursor-pointer">
                      Mostrar inactivos
                    </Label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Results count on mobile */}
      {isMobile && filteredBarbers.length > 0 && (
        <p className="text-sm text-muted-foreground px-1">
          {filteredBarbers.length} barbero{filteredBarbers.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Barbers List */}
      {filteredBarbers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">No hay barberos</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {searchQuery
                ? 'No se encontraron resultados para tu búsqueda'
                : 'Añade tu primer barbero para empezar'}
            </p>
            {!searchQuery && (
              <Button onClick={openNewModal} className="h-11">
                <Plus className="h-4 w-4 mr-2" />
                Añadir Barbero
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <motion.div 
          className="grid gap-3 sm:gap-4"
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.05
              }
            }
          }}
        >
          {filteredBarbers.map((barber, index) => (
            <motion.div
              key={barber.id}
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0 }
              }}
            >
              <BarberCard
                barber={barber}
                onEdit={() => openEditModal(barber)}
                onManageSchedule={() => openScheduleSheet(barber)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Barber Modal */}
      <BarberModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        barber={selectedBarber}
        onSave={handleSaveBarber}
      />

      {/* Schedule - Drawer on mobile, Sheet on desktop */}
      {isMobile ? (
        <Drawer open={scheduleSheetOpen} onOpenChange={setScheduleSheetOpen}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-lg">
                Horario de {editingBarber?.name}
              </DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto px-4">
              <ScheduleContent />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={scheduleSheetOpen} onOpenChange={setScheduleSheetOpen}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader className="mb-6">
              <Button
                variant="ghost"
                size="sm"
                className="w-fit -ml-2 mb-2"
                onClick={() => setScheduleSheetOpen(false)}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Volver
              </Button>
              <SheetTitle className="text-xl">
                Horario de {editingBarber?.name}
              </SheetTitle>
            </SheetHeader>
            <ScheduleContent />
          </SheetContent>
        </Sheet>
      )}

      {/* Generic Confirmation Dialog */}
      <ConfirmActionDialog {...confirmDialogProps} />
    </div>
  );
}