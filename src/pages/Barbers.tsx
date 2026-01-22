import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Barber, CreateBarberData, BarberSchedule, TimeOff } from '@/types/barber';
import { supabaseBarbersApi } from '@/services/supabaseBarbers';
import BarberCard from '@/components/barbers/BarberCard';
import BarberModal from '@/components/barbers/BarberModal';
import ScheduleEditor from '@/components/barbers/ScheduleEditor';
import TimeOffManager from '@/components/barbers/TimeOffManager';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Search,
  Loader2,
  Users,
  ArrowLeft,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export default function Barbers() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [scheduleSheetOpen, setScheduleSheetOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const { toast } = useToast();

  const loadBarbers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await supabaseBarbersApi.getAll(showInactive);
      setBarbers(data);
    } catch (error) {
      console.error('Error loading barbers:', error);
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

  const filteredBarbers = barbers.filter((barber) =>
    barber.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    barber.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    barber.phone?.includes(searchQuery)
  );

  const handleSaveBarber = async (data: CreateBarberData) => {
    try {
      if (selectedBarber) {
        await supabaseBarbersApi.update(selectedBarber.id, data);
        toast({ title: 'Barbero actualizado' });
      } else {
        await supabaseBarbersApi.create(data);
        toast({ title: 'Barbero creado' });
      }
      await loadBarbers();
    } catch (error) {
      console.error('Error saving barber:', error);
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
    try {
      await supabaseBarbersApi.updateSchedule(editingBarber.id, schedule);
      toast({ title: 'Horario actualizado' });
      await loadBarbers();
      // Update local editing barber
      setEditingBarber((prev) => prev ? { ...prev, schedule } : null);
    } catch (error) {
      console.error('Error saving schedule:', error);
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
    try {
      await supabaseBarbersApi.updateTimeOff(editingBarber.id, timeOff);
      toast({ title: 'Días libres actualizados' });
      await loadBarbers();
      setEditingBarber((prev) => prev ? { ...prev, time_off: timeOff } : null);
    } catch (error) {
      console.error('Error saving time off:', error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Barberos
          </h1>
          <p className="text-muted-foreground">
            Gestiona tu equipo y sus horarios
          </p>
        </div>
        <Button onClick={openNewModal}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Barbero
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email o teléfono..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive" className="text-sm">
                Mostrar inactivos
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Barbers List */}
      {filteredBarbers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">No hay barberos</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {searchQuery
                ? 'No se encontraron resultados para tu búsqueda'
                : 'Añade tu primer barbero para empezar'}
            </p>
            {!searchQuery && (
              <Button onClick={openNewModal}>
                <Plus className="h-4 w-4 mr-2" />
                Añadir Barbero
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredBarbers.map((barber) => (
            <BarberCard
              key={barber.id}
              barber={barber}
              onEdit={() => openEditModal(barber)}
              onManageSchedule={() => openScheduleSheet(barber)}
            />
          ))}
        </div>
      )}

      {/* Barber Modal */}
      <BarberModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        barber={selectedBarber}
        onSave={handleSaveBarber}
      />

      {/* Schedule Sheet */}
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

          {editingBarber && (
            <div className="space-y-6">
              <ScheduleEditor
                schedule={editingBarber.schedule}
                onSave={handleSaveSchedule}
              />
              <TimeOffManager
                timeOff={editingBarber.time_off}
                onSave={handleSaveTimeOff}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
