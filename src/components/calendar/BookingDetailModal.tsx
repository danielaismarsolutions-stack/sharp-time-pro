import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import {
  X,
  User,
  Phone,
  Mail,
  Clock,
  Calendar,
  Scissors,
  MessageSquare,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Euro,
  Globe,
  PhoneCall,
  Footprints,
  UserCheck,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { StatusBadge, BookingStatus } from './StatusBadge';
import { ApiBooking } from '@/types/api';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BookingDetailModalProps {
  booking: ApiBooking | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (bookingId: string, status: BookingStatus) => void;
  onEdit: (booking: ApiBooking) => void;
  onDelete: (bookingId: string) => void;
}

const sourceConfig = {
  online: { label: 'Reserva Online', icon: Globe, color: 'text-blue-400' },
  phone: { label: 'Llamada', icon: PhoneCall, color: 'text-emerald-400' },
  walk_in: { label: 'Sin cita', icon: Footprints, color: 'text-amber-400' },
};

export function BookingDetailModal({
  booking,
  open,
  onClose,
  onStatusChange,
  onEdit,
  onDelete,
}: BookingDetailModalProps) {
  const navigate = useNavigate();
  
  if (!booking) return null;

  const source = sourceConfig[booking.source] || sourceConfig.online;
  const SourceIcon = source.icon;
  const startTime = booking.start_time.substring(0, 5);
  const endTime = booking.end_time.substring(0, 5);
  const bookingDate = parseISO(booking.booking_date);

  const handleClientClick = () => {
    if (booking.client_id) {
      onClose();
      navigate(`/clients/${booking.client_id}`);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles de la Cita</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Status & Source */}
          <div className="flex items-center justify-between">
            <StatusBadge status={booking.status as BookingStatus} />
            <div className={cn('flex items-center gap-1 text-[10px]', source.color)}>
              <SourceIcon className="h-3 w-3" />
              {source.label}
            </div>
          </div>

          {/* Date & Time */}
          <div className="bg-muted/30 rounded-lg p-2.5">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium capitalize">
                  {format(bookingDate, "EEE, d MMM", { locale: es })}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">
                  {startTime} - {endTime}
                </span>
              </div>
            </div>
          </div>

          {/* Client Info */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Cliente
            </h4>
            <div
              className={cn(
                "bg-muted/30 rounded-lg p-2.5 space-y-2",
                booking.client_id && "cursor-pointer hover:bg-muted/50 transition-colors group"
              )}
              onClick={booking.client_id ? handleClientClick : undefined}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium group-hover:text-primary transition-colors">{booking.client_name}</p>
                  </div>
                </div>
                {booking.client_id && (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </div>
              <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                <a
                  href={`tel:${booking.client_phone}`}
                  className="flex items-center gap-1.5 text-[11px] hover:text-primary transition-colors"
                >
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span>{booking.client_phone}</span>
                </a>
                {booking.client_email && (
                  <a
                    href={`mailto:${booking.client_email}`}
                    className="flex items-center gap-1.5 text-[11px] hover:text-primary transition-colors"
                  >
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span>{booking.client_email}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Service Info */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Servicio
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center">
                    <Scissors className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">{booking.service_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {booking.service_duration} min
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 text-sm font-semibold text-primary">
                  <Euro className="h-3.5 w-3.5" />
                  {booking.service_price}
                </div>
              </div>

              {booking.barber && (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center">
                    <UserCheck className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">{booking.barber}</p>
                    <p className="text-[10px] text-muted-foreground">Barbero</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {booking.notes && (
            <>
              <Separator />
              <div className="space-y-1">
                <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <MessageSquare className="h-3 w-3" />
                  Notas
                </h4>
                <p className="text-[11px] bg-muted/30 rounded-lg p-2">{booking.notes}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Quick Actions */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Acciones Rápidas
            </h4>
            <div className="grid grid-cols-2 gap-1.5">
              {booking.status !== 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start h-7 text-[11px] px-2"
                  onClick={() => onStatusChange(booking.id, 'completed')}
                >
                  <CheckCircle className="h-3 w-3 mr-1.5 text-emerald-400" />
                  Completar
                </Button>
              )}
              {booking.status !== 'no_show' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start h-7 text-[11px] px-2"
                  onClick={() => onStatusChange(booking.id, 'no_show')}
                >
                  <AlertCircle className="h-3 w-3 mr-1.5 text-purple-400" />
                  No presentado
                </Button>
              )}
              {booking.status !== 'cancelled' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start h-7 text-[11px] px-2"
                  onClick={() => onStatusChange(booking.id, 'cancelled')}
                >
                  <XCircle className="h-3 w-3 mr-1.5 text-rose-400" />
                  Cancelar
                </Button>
              )}
              {booking.status !== 'confirmed' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start h-7 text-[11px] px-2"
                  onClick={() => onStatusChange(booking.id, 'confirmed')}
                >
                  <CheckCircle className="h-3 w-3 mr-1.5 text-blue-400" />
                  Confirmar
                </Button>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => onEdit(booking)}
            >
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              Editar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onDelete(booking.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Metadata */}
          <div className="text-[9px] text-muted-foreground space-y-0.5">
            <p>Creado: {format(parseISO(booking.created_at), "d MMM yyyy, HH:mm", { locale: es })}</p>
            <p>Actualizado: {format(parseISO(booking.updated_at), "d MMM yyyy, HH:mm", { locale: es })}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
