import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
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
  if (!booking) return null;

  const source = sourceConfig[booking.source] || sourceConfig.online;
  const SourceIcon = source.icon;
  const startTime = booking.start_time.substring(0, 5);
  const endTime = booking.end_time.substring(0, 5);
  const bookingDate = parseISO(booking.booking_date);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-6">
            <span>Detalles de la Cita</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Status & Source */}
          <div className="flex items-center justify-between">
            <StatusBadge status={booking.status as BookingStatus} />
            <div className={cn('flex items-center gap-1.5 text-sm', source.color)}>
              <SourceIcon className="h-4 w-4" />
              {source.label}
            </div>
          </div>

          {/* Date & Time */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="font-medium capitalize">
                  {format(bookingDate, "EEEE, d 'de' MMMM", { locale: es })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  {startTime} - {endTime}
                </span>
              </div>
            </div>
          </div>

          {/* Client Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Información del Cliente
            </h4>
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{booking.client_name}</p>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                </div>
              </div>
              <div className="space-y-2">
                <a
                  href={`tel:${booking.client_phone}`}
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                >
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.client_phone}</span>
                </a>
                {booking.client_email && (
                  <a
                    href={`mailto:${booking.client_email}`}
                    className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                  >
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{booking.client_email}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Service Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Detalles del Servicio
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <Scissors className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{booking.service_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.service_duration} minutos
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-lg font-semibold text-primary">
                  <Euro className="h-5 w-5" />
                  {booking.service_price}
                </div>
              </div>

              {booking.barber && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <UserCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{booking.barber}</p>
                    <p className="text-sm text-muted-foreground">Barbero asignado</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {booking.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Notas
                </h4>
                <p className="text-sm bg-muted/30 rounded-lg p-3">{booking.notes}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Quick Actions */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Acciones Rápidas
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {booking.status !== 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() => onStatusChange(booking.id, 'completed')}
                >
                  <CheckCircle className="h-4 w-4 mr-2 text-emerald-400" />
                  Completar
                </Button>
              )}
              {booking.status !== 'no_show' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() => onStatusChange(booking.id, 'no_show')}
                >
                  <AlertCircle className="h-4 w-4 mr-2 text-purple-400" />
                  No presentado
                </Button>
              )}
              {booking.status !== 'cancelled' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() => onStatusChange(booking.id, 'cancelled')}
                >
                  <XCircle className="h-4 w-4 mr-2 text-rose-400" />
                  Cancelar
                </Button>
              )}
              {booking.status !== 'confirmed' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() => onStatusChange(booking.id, 'confirmed')}
                >
                  <CheckCircle className="h-4 w-4 mr-2 text-blue-400" />
                  Confirmar
                </Button>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onEdit(booking)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => onDelete(booking.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Metadata */}
          <div className="text-[11px] text-muted-foreground space-y-0.5 pt-2">
            <p>Creado: {format(parseISO(booking.created_at), "d MMM yyyy, HH:mm", { locale: es })}</p>
            <p>Actualizado: {format(parseISO(booking.updated_at), "d MMM yyyy, HH:mm", { locale: es })}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
