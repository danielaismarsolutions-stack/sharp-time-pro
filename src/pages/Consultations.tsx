import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MessageSquare, Inbox, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { getBusinessId } from '@/config/session';
import { supabaseConsultationsApi } from '@/services/supabaseConsultations';
import { useConsultations as useConsultationsQuery, queryKeys } from '@/hooks/useQueryHooks';
import { notifyAllAdmins } from '@/services/supabaseNotifications';
import { Consultation, ConsultationStatus, STATUS_CONFIG } from '@/types/consultation';
import { ConsultationTable } from '@/components/consultations/ConsultationTable';
import { ConsultationCard } from '@/components/consultations/ConsultationCard';
import { ConsultationDetailModal } from '@/components/consultations/ConsultationDetailModal';
import { ConsultationBookingModal } from '@/components/consultations/ConsultationBookingModal';
import { PhotoModal } from '@/components/consultations/PhotoModal';
import { NotesModal } from '@/components/consultations/NotesModal';
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
  const { confirm, dialogProps: confirmDialogProps } = useConfirmAction();
  const isMobile = useIsMobile();
  
  const queryClient = useQueryClient();
  const { data: consultations = [], isLoading: loading } = useConsultationsQuery();
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');

  // Modal states
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingConsultation, setBookingConsultation] = useState<Consultation | null>(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoConsultation, setPhotoConsultation] = useState<Consultation | null>(null);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesConsultation, setNotesConsultation] = useState<Consultation | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConsultation, setDeleteConsultation] = useState<Consultation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const invalidateConsultations = () => queryClient.invalidateQueries({ queryKey: queryKeys.consultations });

  // Real-time subscription with notification support
  useEffect(() => {
    const channel = supabaseConsultationsApi.subscribeToChanges(async (payload) => {
      // Invalidate cache to trigger refetch
      invalidateConsultations();

      // Notify all admins about new consultations
      if (payload.eventType === 'INSERT' && payload.new) {
        try {
          await notifyAllAdmins({
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
        } catch { /* ignored */ }
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
    const confirmed = await confirm({
      title: 'Cambiar estado de consulta',
      description: `¿Estás seguro de marcar esta consulta como "${STATUS_CONFIG[status].label}"?`,
      confirmLabel: 'Confirmar',
      variant: status === 'cancelled' ? 'destructive' : 'default',
    });
    if (!confirmed) return;

    try {
      await supabaseConsultationsApi.updateStatus(id, status);

      // Notify all admins about consultation status change
      {
        const consultation = consultations.find((c) => c.id === id);
        try {
          await notifyAllAdmins({
            business_id: getBusinessId(),
            type: 'consultation_updated',
            title: 'Estado de consulta actualizado',
            message: `${user?.name || 'Usuario'} marcó la consulta de ${consultation?.client_name || 'cliente'} como "${STATUS_CONFIG[status].label}"`,
            metadata: {
              consultation_id: id,
              client_name: consultation?.client_name,
              new_status: status,
              modified_by: user?.name,
            },
          });
        } catch { /* ignored */ }
      }

      invalidateConsultations();
      toast({
        title: 'Estado actualizado',
        description: `La consulta se marcó como "${STATUS_CONFIG[status].label}"`,
      });
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
    const confirmed = await confirm({
      title: 'Guardar notas',
      description: '¿Confirmar los cambios en las notas de esta consulta?',
      confirmLabel: 'Guardar',
    });
    if (!confirmed) return;

    try {
      await supabaseConsultationsApi.updateStaffNotes(id, notes);
      invalidateConsultations();
      toast({
        title: 'Notas guardadas',
        description: 'Las notas se han guardado correctamente',
      });
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
      
      // Notify all admins about consultation scheduled
      try {
        await notifyAllAdmins({
          business_id: getBusinessId(),
          type: 'consultation_updated',
          title: 'Consulta programada',
          message: `${user?.name || 'Usuario'} convirtió la consulta de ${bookingConsultation.client_name} (${bookingConsultation.service_name}) a reserva`,
          metadata: {
            consultation_id: bookingConsultation.id,
            client_name: bookingConsultation.client_name,
            service_name: bookingConsultation.service_name,
            modified_by: user?.name,
          },
        });
      } catch { /* ignored */ }
      
      // Refresh consultations
      invalidateConsultations();
      toast({
        title: 'Consulta actualizada',
        description: 'La consulta se ha marcado como programada',
      });
    }
  };

  const openDeleteConfirm = (consultation: Consultation) => {
    setDeleteConsultation(consultation);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConsultation) return;
    setDeleting(true);
    try {
      await supabaseConsultationsApi.delete(deleteConsultation.id);
      invalidateConsultations();
      if (selectedConsultation?.id === deleteConsultation.id) {
        setSelectedConsultation(null);
      }

      // Notify all admins about consultation deletion
      try {
        await notifyAllAdmins({
          business_id: getBusinessId(),
          type: 'consultation_deleted',
          title: 'Consulta eliminada',
          message: `${user?.name || 'Usuario'} eliminó la consulta de ${deleteConsultation.client_name}`,
          metadata: {
            consultation_id: deleteConsultation.id,
            client_name: deleteConsultation.client_name,
            deleted_by: user?.name,
          },
        });
      } catch { /* ignored */ }

      toast({
        title: 'Consulta eliminada',
        description: `La consulta de ${deleteConsultation.client_name} ha sido eliminada`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la consulta',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setDeleteConsultation(null);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 overflow-x-hidden w-full max-w-full">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          Consultas
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Solicitudes de consulta pendientes
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 md:gap-2">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setActiveFilter(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs md:text-sm font-medium transition-colors min-h-[36px]',
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
                onDelete={() => openDeleteConfirm(consultation)}
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
            onDelete={openDeleteConfirm}
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
          onDelete={() => {
            setSelectedConsultation(null);
            openDeleteConfirm(selectedConsultation);
          }}
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

      {/* Generic Confirmation Dialog */}
      <ConfirmActionDialog {...confirmDialogProps} />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={(isOpen) => { if (!isOpen) { setDeleteConfirmOpen(false); setDeleteConsultation(null); } }}>
        <AlertDialogContent className="max-w-[360px] sm:max-w-md p-0 overflow-hidden">
          <AlertDialogHeader className="px-5 pt-5 pb-0">
            <AlertDialogTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              ¿Eliminar consulta?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Se eliminará permanentemente la consulta de <strong>{deleteConsultation?.client_name}</strong> para <strong>{deleteConsultation?.service_name}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-5 pb-5 pt-4 flex flex-row gap-3 sm:space-x-0">
            <AlertDialogCancel
              disabled={deleting}
              className="flex-1 h-11 text-sm font-medium mt-0"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 h-11 text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
