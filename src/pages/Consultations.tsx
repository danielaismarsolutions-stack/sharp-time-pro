import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Inbox } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { getBusinessId } from '@/config/session';
import { supabaseConsultationsApi } from '@/services/supabaseConsultations';
import { createNotification } from '@/services/supabaseNotifications';
import { Consultation, ConsultationStatus, STATUS_CONFIG } from '@/types/consultation';
import { ConsultationTable } from '@/components/consultations/ConsultationTable';
import { ConsultationCard } from '@/components/consultations/ConsultationCard';
import { ConsultationDetailModal } from '@/components/consultations/ConsultationDetailModal';
import { ConsultationBookingModal } from '@/components/consultations/ConsultationBookingModal';
import { PhotoModal } from '@/components/consultations/PhotoModal';
import { NotesModal } from '@/components/consultations/NotesModal';
import { cn } from '@/lib/utils';

type FilterStatus = 'all' | ConsultationStatus;

const filterOptions: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'new', label: 'Nuevas' },
  { value: 'contacted', label: 'Contactadas' },
  { value: 'scheduled', label: 'Programadas' },
  { value: 'completed', label: 'Completadas' },
  { value: 'cancelled', label: 'Canceladas' },
];

export default function Consultations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  
  // Modal states
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingConsultation, setBookingConsultation] = useState<Consultation | null>(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoConsultation, setPhotoConsultation] = useState<Consultation | null>(null);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesConsultation, setNotesConsultation] = useState<Consultation | null>(null);

  // Fetch consultations
  const fetchConsultations = async () => {
    try {
      const data = await supabaseConsultationsApi.getAll();
      setConsultations(data);
    } catch (error) {
      console.error('Error fetching consultations:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las consultas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultations();

    // Set up real-time subscription with notification support
    const channel = supabaseConsultationsApi.subscribeToChanges(async (payload) => {
      // Refresh the list
      fetchConsultations();
      
      // Create notification for new consultations
      if (payload.eventType === 'INSERT' && payload.new && user?.id) {
        try {
          await createNotification({
            user_id: user.id,
            business_id: getBusinessId(),
            type: 'consultation_created',
            title: 'Nueva consulta recibida',
            message: `${payload.new.client_name} ha enviado una consulta para ${payload.new.service_name}`,
            metadata: {
              consultation_id: payload.new.id,
              client_name: payload.new.client_name,
              client_phone: payload.new.client_phone,
              service_name: payload.new.service_name,
            },
          });
          console.log('🔔 New consultation notification created');
        } catch (error) {
          console.error('Failed to create consultation notification:', error);
        }
      }
    });

    return () => {
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Filter counts
  const statusCounts = useMemo(() => {
    const counts: Record<FilterStatus, number> = {
      all: consultations.length,
      new: 0,
      contacted: 0,
      scheduled: 0,
      completed: 0,
      cancelled: 0,
    };

    consultations.forEach((c) => {
      counts[c.status]++;
    });

    return counts;
  }, [consultations]);

  // Filtered consultations
  const filteredConsultations = useMemo(() => {
    if (activeFilter === 'all') return consultations;
    return consultations.filter((c) => c.status === activeFilter);
  }, [consultations, activeFilter]);

  // Handlers
  const handleStatusChange = async (id: string, status: ConsultationStatus) => {
    try {
      await supabaseConsultationsApi.updateStatus(id, status);
      toast({
        title: 'Estado actualizado',
        description: `La consulta se marcó como "${STATUS_CONFIG[status].label}"`,
      });
      // Update local state optimistically
      setConsultations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status } : c))
      );
      if (selectedConsultation?.id === id) {
        setSelectedConsultation((prev) => prev ? { ...prev, status } : null);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado',
        variant: 'destructive',
      });
    }
  };

  const handleNotesChange = async (id: string, notes: string) => {
    try {
      await supabaseConsultationsApi.updateStaffNotes(id, notes);
      toast({
        title: 'Notas guardadas',
        description: 'Las notas se han guardado correctamente',
      });
      // Update local state
      setConsultations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, staff_notes: notes } : c))
      );
      if (selectedConsultation?.id === id) {
        setSelectedConsultation((prev) => prev ? { ...prev, staff_notes: notes } : null);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron guardar las notas',
        variant: 'destructive',
      });
    }
  };

  const openPhotoModal = (consultation: Consultation) => {
    setPhotoConsultation(consultation);
    setPhotoModalOpen(true);
  };

  const openNotesModal = (consultation: Consultation) => {
    setNotesConsultation(consultation);
    setNotesModalOpen(true);
  };

  const openBookingModal = (consultation: Consultation) => {
    setBookingConsultation(consultation);
    setBookingModalOpen(true);
    setSelectedConsultation(null); // Close detail modal
  };

  const handleBookingCreated = async () => {
    if (bookingConsultation) {
      // Mark consultation as scheduled
      await supabaseConsultationsApi.markAsScheduled(bookingConsultation.id);
      
      // Create notification for consultation scheduled
      if (user?.id) {
        try {
          await createNotification({
            user_id: user.id,
            business_id: getBusinessId(),
            type: 'consultation_updated',
            title: 'Consulta programada',
            message: `La consulta de ${bookingConsultation.client_name} para ${bookingConsultation.service_name} ha sido convertida a reserva`,
            metadata: {
              consultation_id: bookingConsultation.id,
              client_name: bookingConsultation.client_name,
              service_name: bookingConsultation.service_name,
            },
          });
          console.log('🔔 Consultation notification created');
        } catch (error) {
          console.error('Failed to create notification:', error);
        }
      }
      
      // Refresh consultations
      fetchConsultations();
      toast({
        title: 'Consulta actualizada',
        description: 'La consulta se ha marcado como programada',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          Consultas
        </h1>
        <p className="text-muted-foreground mt-1">
          Solicitudes de consulta pendientes
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setActiveFilter(option.value)}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              activeFilter === option.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-foreground'
            )}
          >
            {option.label}
            <Badge
              variant="secondary"
              className={cn(
                'ml-1 px-1.5 py-0 text-xs',
                activeFilter === option.value
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : ''
              )}
            >
              {statusCounts[option.value]}
            </Badge>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredConsultations.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center h-64 text-center"
        >
          <Inbox className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No hay consultas</h3>
          <p className="text-muted-foreground text-sm mt-1">
            {activeFilter === 'all'
              ? 'Aún no se han recibido solicitudes de consulta'
              : `No hay consultas con estado "${filterOptions.find((f) => f.value === activeFilter)?.label}"`}
          </p>
        </motion.div>
      ) : isMobile ? (
        // Mobile: Card View
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {filteredConsultations.map((consultation, index) => (
            <motion.div
              key={consultation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ConsultationCard
                consultation={consultation}
                onStatusChange={(status) => handleStatusChange(consultation.id, status)}
                onViewPhoto={() => openPhotoModal(consultation)}
                onAddNotes={() => openNotesModal(consultation)}
                onClick={() => setSelectedConsultation(consultation)}
              />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        // Desktop: Table View
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <ConsultationTable
            consultations={filteredConsultations}
            onStatusChange={handleStatusChange}
            onViewPhoto={openPhotoModal}
            onAddNotes={openNotesModal}
            onRowClick={setSelectedConsultation}
          />
        </motion.div>
      )}

      {/* Detail Modal */}
      {selectedConsultation && (
        <ConsultationDetailModal
          open={!!selectedConsultation}
          onOpenChange={(open) => !open && setSelectedConsultation(null)}
          consultation={selectedConsultation}
          onStatusChange={(status) => handleStatusChange(selectedConsultation.id, status)}
          onNotesChange={(notes) => handleNotesChange(selectedConsultation.id, notes)}
          onConvertToBooking={() => openBookingModal(selectedConsultation)}
        />
      )}

      {/* Booking Modal */}
      {bookingConsultation && (
        <ConsultationBookingModal
          open={bookingModalOpen}
          onOpenChange={setBookingModalOpen}
          consultation={bookingConsultation}
          onBooked={handleBookingCreated}
        />
      )}

      {/* Photo Modal */}
      {photoConsultation && photoConsultation.photo_url && (
        <PhotoModal
          open={photoModalOpen}
          onOpenChange={setPhotoModalOpen}
          photoUrl={photoConsultation.photo_url}
          clientName={photoConsultation.client_name}
        />
      )}

      {/* Notes Modal */}
      {notesConsultation && (
        <NotesModal
          open={notesModalOpen}
          onOpenChange={setNotesModalOpen}
          currentNotes={notesConsultation.staff_notes || ''}
          clientName={notesConsultation.client_name}
          onSave={(notes) => handleNotesChange(notesConsultation.id, notes)}
        />
      )}
    </div>
  );
}
