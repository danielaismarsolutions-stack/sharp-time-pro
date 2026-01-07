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

interface BookingDetailPanelProps {
  booking: Booking;
  onClose: () => void;
  onEdit: () => void;
  onStatusChange: (status: Booking['status']) => void;
  onDelete: () => void;
}

const statusConfig = {
  pending: { label: 'Pending', class: 'status-badge-pending', icon: AlertCircle },
  confirmed: { label: 'Confirmed', class: 'status-badge-success', icon: CheckCircle },
  completed: { label: 'Completed', class: 'status-badge-success', icon: CheckCircle },
  cancelled: { label: 'Cancelled', class: 'status-badge-cancelled', icon: XCircle },
  'no-show': { label: 'No-show', class: 'status-badge-cancelled', icon: XCircle },
};

const sourceConfig = {
  online: { label: 'Online Booking', color: 'bg-blue-500/20 text-blue-400' },
  phone: { label: 'Phone Call', color: 'bg-emerald-500/20 text-emerald-400' },
  'walk-in': { label: 'Walk-in', color: 'bg-amber-500/20 text-amber-400' },
};

export default function BookingDetailPanel({
  booking,
  onClose,
  onEdit,
  onStatusChange,
  onDelete,
}: BookingDetailPanelProps) {
  const status = statusConfig[booking.status];
  const source = sourceConfig[booking.source];
  const StatusIcon = status.icon;

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold">Appointment Details</h3>
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
            {status.label}
          </Badge>
          <Badge variant="outline" className={source.color}>
            {source.label}
          </Badge>
        </div>

        {/* Client Info */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Client Information
          </h4>
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{booking.clientName}</p>
                <p className="text-sm text-muted-foreground">Client</p>
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
            Appointment Details
          </h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <Scissors className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">{booking.serviceName}</p>
                <p className="text-sm text-muted-foreground">
                  {booking.serviceDuration} minutes • €{booking.servicePrice}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">{format(new Date(booking.date), 'EEEE, MMMM d, yyyy')}</p>
                <p className="text-sm text-muted-foreground">Date</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">{booking.time}</p>
                <p className="text-sm text-muted-foreground">Time</p>
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
                Notes
              </h4>
              <p className="text-sm bg-muted/30 rounded-lg p-3">{booking.notes}</p>
            </div>
          </>
        )}

        <Separator />

        {/* Quick Status Actions */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Quick Actions
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
                Complete
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
                No-show
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
                Cancel
              </Button>
            )}
            <Button variant="outline" size="sm" className="justify-start">
              <Send className="h-4 w-4 mr-2" />
              Remind
            </Button>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
        <Button variant="destructive" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
