import { useRef } from 'react';
import { format, parseISO } from 'date-fns';
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
  Banknote,
  CreditCard,
  Smartphone,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { StatusBadge, BookingStatus } from './StatusBadge';
import { useStaffTerms } from '@/hooks/useStaffTerms';
import { useTranslation } from '@/contexts/LanguageContext';
import { ApiBooking, ApiPaymentMethod } from '@/types/api';
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
  onPaymentChange: (bookingId: string, method: ApiPaymentMethod | null) => void;
  onEdit: (booking: ApiBooking) => void;
  onDelete: (bookingId: string) => void;
}

const sourceConfig = {
  online: { labelKey: 'calendar.source.online', icon: Globe, color: 'text-blue-400' },
  phone: { labelKey: 'calendar.source.phone', icon: PhoneCall, color: 'text-emerald-400' },
  walk_in: { labelKey: 'calendar.source.walkIn', icon: Footprints, color: 'text-amber-400' },
} as const;

export function BookingDetailModal({
  booking,
  open,
  onClose,
  onStatusChange,
  onPaymentChange,
  onEdit,
  onDelete,
}: BookingDetailModalProps) {
  const navigate = useNavigate();
  const staffTerms = useStaffTerms();
  const { t, dateLocale } = useTranslation();

  // Preserve last valid booking for smooth close animation.
  // Without this, setting booking to null unmounts DialogContent
  // and kills the exit transition (overlay fade + content zoom-out).
  const lastBookingRef = useRef<ApiBooking | null>(null);
  if (booking) {
    lastBookingRef.current = booking;
  }
  const currentBooking = booking || lastBookingRef.current;

  if (!currentBooking) return null;

  const source = sourceConfig[currentBooking.source] || sourceConfig.online;
  const SourceIcon = source.icon;
  const startTime = currentBooking.start_time.substring(0, 5);
  const endTime = currentBooking.end_time.substring(0, 5);
  const bookingDate = parseISO(currentBooking.booking_date);

  const handleClientClick = () => {
    if (currentBooking.client_id) {
      onClose();
      navigate(`/clients/${currentBooking.client_id}`);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:w-full sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('calendar.detail.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Status & Source */}
          <div className="flex items-center justify-between">
            <StatusBadge status={currentBooking.status as BookingStatus} />
            <div className={cn('flex items-center gap-1 text-[10px]', source.color)}>
              <SourceIcon className="h-3 w-3" />
              {t(source.labelKey)}
            </div>
          </div>

          {/* Date & Time */}
          <div className="bg-muted/30 rounded-lg p-2.5">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium capitalize">
                  {format(bookingDate, "EEE, d MMM", { locale: dateLocale })}
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
              {t('calendar.detail.client')}
            </h4>
            <div
              className={cn(
                "bg-muted/30 rounded-lg p-2.5 space-y-2",
                currentBooking.client_id && "cursor-pointer hover:bg-muted/50 transition-colors group"
              )}
              onClick={currentBooking.client_id ? handleClientClick : undefined}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium group-hover:text-primary transition-colors">{currentBooking.client_name}</p>
                  </div>
                </div>
                {currentBooking.client_id && (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </div>
              <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                <a
                  href={`tel:${currentBooking.client_phone}`}
                  className="flex items-center gap-1.5 text-[11px] hover:text-primary transition-colors"
                >
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span>{currentBooking.client_phone}</span>
                </a>
                {currentBooking.client_email && (
                  <a
                    href={`mailto:${currentBooking.client_email}`}
                    className="flex items-center gap-1.5 text-[11px] hover:text-primary transition-colors"
                  >
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span>{currentBooking.client_email}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Service Info */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              {t('calendar.detail.service')}
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center">
                    <Scissors className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">{currentBooking.service_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {currentBooking.service_duration} {t('common.minutesShort')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 text-sm font-semibold text-primary">
                  <Euro className="h-3.5 w-3.5" />
                  {currentBooking.service_price}
                </div>
              </div>

              {currentBooking.barber && (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center">
                    <UserCheck className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">{currentBooking.barber}</p>
                    <p className="text-[10px] text-muted-foreground">{staffTerms.singularCap}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {currentBooking.notes && (
            <>
              <Separator />
              <div className="space-y-1">
                <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <MessageSquare className="h-3 w-3" />
                  {t('common.notes')}
                </h4>
                <p className="text-[11px] bg-muted/30 rounded-lg p-2">{currentBooking.notes}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Payment Section */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              {t('calendar.detail.payment')}
            </h4>
            {currentBooking.payment_status === 'paid' ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-400">
                      {t('calendar.detail.paidWith', {
                        method:
                          currentBooking.payment_method === 'cash'
                            ? t('calendar.payment.cash')
                            : currentBooking.payment_method === 'card'
                              ? t('calendar.payment.card')
                              : t('calendar.payment.bizum'),
                      })}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                    onClick={() => onPaymentChange(currentBooking.id, null)}
                  >
                    <Undo2 className="h-3 w-3 mr-1" />
                    {t('calendar.detail.undoPayment')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <button
                  className="group flex flex-col items-center gap-1.5 rounded-xl border border-border/50 bg-muted/20 px-2 py-2.5 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:shadow-sm"
                  onClick={() => onPaymentChange(currentBooking.id, 'cash')}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 transition-colors group-hover:bg-emerald-500/20">
                    <Banknote className="h-4 w-4 text-emerald-500" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground group-hover:text-emerald-500 transition-colors">Efectivo</span>
                </button>
                <button
                  className="group flex flex-col items-center gap-1.5 rounded-xl border border-border/50 bg-muted/20 px-2 py-2.5 transition-all hover:border-blue-500/40 hover:bg-blue-500/10 hover:shadow-sm"
                  onClick={() => onPaymentChange(currentBooking.id, 'card')}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 transition-colors group-hover:bg-blue-500/20">
                    <CreditCard className="h-4 w-4 text-blue-500" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground group-hover:text-blue-500 transition-colors">Tarjeta</span>
                </button>
                <button
                  className="group flex flex-col items-center gap-1.5 rounded-xl border border-border/50 bg-muted/20 px-2 py-2.5 transition-all hover:border-violet-500/40 hover:bg-violet-500/10 hover:shadow-sm"
                  onClick={() => onPaymentChange(currentBooking.id, 'bizum')}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/10 transition-colors group-hover:bg-violet-500/20">
                    <Smartphone className="h-4 w-4 text-violet-500" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground group-hover:text-violet-500 transition-colors">Bizum</span>
                </button>
              </div>
            )}
          </div>

          <Separator />

          {/* Quick Actions */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Acciones Rápidas
            </h4>
            <div className="grid grid-cols-2 gap-1.5">
              {currentBooking.status !== 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start h-7 text-[11px] px-2"
                  onClick={() => onStatusChange(currentBooking.id, 'completed')}
                >
                  <CheckCircle className="h-3 w-3 mr-1.5 text-emerald-400" />
                  Completar
                </Button>
              )}
              {currentBooking.status !== 'no_show' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start h-7 text-[11px] px-2"
                  onClick={() => onStatusChange(currentBooking.id, 'no_show' as BookingStatus)}
                >
                  <AlertCircle className="h-3 w-3 mr-1.5 text-purple-400" />
                  No presentado
                </Button>
              )}
              {currentBooking.status !== 'cancelled' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start h-7 text-[11px] px-2"
                  onClick={() => onStatusChange(currentBooking.id, 'cancelled')}
                >
                  <XCircle className="h-3 w-3 mr-1.5 text-rose-400" />
                  Cancelar
                </Button>
              )}
              {currentBooking.status !== 'confirmed' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start h-7 text-[11px] px-2"
                  onClick={() => onStatusChange(currentBooking.id, 'confirmed')}
                >
                  <CheckCircle className="h-3 w-3 mr-1.5 text-violet-400" />
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
              onClick={() => onEdit(currentBooking)}
            >
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              Editar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onDelete(currentBooking.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Metadata */}
          <div className="text-[9px] text-muted-foreground space-y-0.5">
            <p>Creado: {format(parseISO(currentBooking.created_at), "d MMM yyyy, HH:mm", { locale: es })}</p>
            <p>Actualizado: {format(parseISO(currentBooking.updated_at), "d MMM yyyy, HH:mm", { locale: es })}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
