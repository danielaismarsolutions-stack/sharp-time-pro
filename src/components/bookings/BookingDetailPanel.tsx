import { format } from 'date-fns';
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
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Booking } from '@/types';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/i18n';

interface BookingDetailPanelProps {
  booking: Booking;
  onClose: () => void;
  onEdit: () => void;
  onStatusChange: (status: Booking['status']) => void;
  onDelete: () => void;
}

const statusConfig: Record<Booking['status'], { labelKey: TranslationKey; class: string; icon: typeof AlertCircle }> = {
  pending: { labelKey: 'bookings.status.pending', class: 'status-badge-pending', icon: AlertCircle },
  confirmed: { labelKey: 'bookings.status.confirmed', class: 'status-badge-success', icon: CheckCircle },
  completed: { labelKey: 'bookings.status.completed', class: 'status-badge-success', icon: CheckCircle },
  cancelled: { labelKey: 'bookings.status.cancelled', class: 'status-badge-cancelled', icon: XCircle },
  'no-show': { labelKey: 'bookings.status.noShow', class: 'status-badge-cancelled', icon: XCircle },
};

const sourceConfig: Record<Booking['source'], { labelKey: TranslationKey; color: string }> = {
  online: { labelKey: 'bookings.source.online', color: 'bg-blue-500/20 text-blue-400' },
  phone: { labelKey: 'bookings.source.phone', color: 'bg-emerald-500/20 text-emerald-400' },
  'walk-in': { labelKey: 'bookings.source.walkIn', color: 'bg-amber-500/20 text-amber-400' },
};

export default function BookingDetailPanel({
  booking,
  onClose,
  onEdit,
  onStatusChange,
  onDelete,
}: BookingDetailPanelProps) {
  const { t, dateLocale } = useTranslation();
  const status = statusConfig[booking.status];
  const source = sourceConfig[booking.source];
  const StatusIcon = status.icon;

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold">{t('bookings.detail.title')}</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <Badge className={cn('flex items-center gap-1', status.class)}>
            <StatusIcon className="h-3 w-3" />
            {t(status.labelKey)}
          </Badge>
          <Badge variant="outline" className={source.color}>
            {t(source.labelKey)}
          </Badge>
        </div>

        {/* Client Info */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t('bookings.detail.clientInfo')}
          </h4>
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{booking.clientName}</p>
                <p className="text-sm text-muted-foreground">{t('bookings.form.client')}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{booking.clientPhone}</span>
              </div>
              {booking.clientEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.clientEmail}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Appointment Info */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t('bookings.detail.title')}
          </h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <Scissors className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">{booking.serviceName}</p>
                <p className="text-sm text-muted-foreground">
                  {t('bookings.form.durationMinutes', { minutes: booking.serviceDuration })} • €{booking.servicePrice}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">{format(new Date(booking.date), t('bookings.dateFormats.long'), { locale: dateLocale })}</p>
                <p className="text-sm text-muted-foreground">{t('common.date')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">{booking.time}</p>
                <p className="text-sm text-muted-foreground">{t('common.time')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {booking.notes && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {t('common.notes')}
              </h4>
              <p className="text-sm bg-muted/30 rounded-lg p-3">{booking.notes}</p>
            </div>
          </>
        )}

        <Separator />

        {/* Quick Status Actions */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t('bookings.detail.quickActions')}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {booking.status !== 'completed' && (
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => onStatusChange('completed')}
              >
                <CheckCircle className="h-4 w-4 mr-2 text-status-success" />
                {t('bookings.actions.complete')}
              </Button>
            )}
            {booking.status !== 'no-show' && (
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => onStatusChange('no-show')}
              >
                <XCircle className="h-4 w-4 mr-2 text-status-cancelled" />
                {t('bookings.status.noShow')}
              </Button>
            )}
            {booking.status !== 'cancelled' && (
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => onStatusChange('cancelled')}
              >
                <XCircle className="h-4 w-4 mr-2 text-status-cancelled" />
                {t('common.cancel')}
              </Button>
            )}
            <Button variant="outline" size="sm" className="justify-start">
              <Send className="h-4 w-4 mr-2" />
              {t('bookings.detail.remind')}
            </Button>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          {t('common.edit')}
        </Button>
        <Button variant="destructive" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
