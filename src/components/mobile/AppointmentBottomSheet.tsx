import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  Edit, 
  Calendar, 
  MessageCircle, 
  Check, 
  Phone, 
  User, 
  X,
  GripHorizontal
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { StatusBadge, BookingStatus } from '@/components/calendar/StatusBadge';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/i18n';

export type AppointmentAction = 
  | 'edit' 
  | 'reschedule' 
  | 'message' 
  | 'complete' 
  | 'call' 
  | 'view-client' 
  | 'cancel';

interface AppointmentData {
  id: string;
  clientName: string;
  clientPhone?: string;
  serviceName: string;
  time: string;
  status: BookingStatus;
}

interface AppointmentBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: AppointmentData | null;
  onAction: (action: AppointmentAction, appointmentId: string) => void;
}

const actionButtons: { action: AppointmentAction; icon: typeof Edit; labelKey: TranslationKey; color: string }[] = [
  { action: 'edit', icon: Edit, labelKey: 'common.edit', color: 'text-blue-400' },
  { action: 'reschedule', icon: Calendar, labelKey: 'bookings.actions.reschedule', color: 'text-purple-400' },
  { action: 'message', icon: MessageCircle, labelKey: 'bookings.actions.message', color: 'text-green-400' },
  { action: 'complete', icon: Check, labelKey: 'bookings.actions.complete', color: 'text-emerald-400' },
  { action: 'call', icon: Phone, labelKey: 'bookings.actions.call', color: 'text-cyan-400' },
  { action: 'view-client', icon: User, labelKey: 'bookings.actions.viewClient', color: 'text-amber-400' },
];

export function AppointmentBottomSheet({ 
  isOpen, 
  onClose, 
  appointment, 
  onAction
}: AppointmentBottomSheetProps) {
  const { t } = useTranslation();

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Close if dragged down more than 100px or with velocity
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

  const handleAction = (action: AppointmentAction) => {
    if (!appointment) return;

    // Handle special actions that open native apps
    if (action === 'call' && appointment.clientPhone) {
      window.open(`tel:${appointment.clientPhone}`, '_self');
      return;
    }

    if (action === 'message' && appointment.clientPhone) {
      // Clean phone number and open WhatsApp
      const cleanPhone = appointment.clientPhone.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${cleanPhone}`;
      window.open(whatsappUrl, '_blank');
      return;
    }

    // For other actions, call the handler
    onAction(action, appointment.id);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AnimatePresence>
      {isOpen && appointment && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ 
              type: 'spring', 
              damping: 30, 
              stiffness: 300 
            }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className={cn(
              "fixed inset-x-0 bottom-0 z-50",
              "bg-background border-t border-border",
              "rounded-t-[20px] shadow-2xl",
              "pb-safe" // iOS safe area
            )}
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
          >
            {/* Drag Handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1.5 bg-muted-foreground/30 rounded-full" />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-4 p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Content */}
            <div className="px-5 pb-4">
              {/* Header - Client Info */}
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="h-14 w-14 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                    {getInitials(appointment.clientName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-foreground truncate">
                    {appointment.clientName}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {appointment.serviceName}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-medium text-foreground">
                      {appointment.time}
                    </span>
                    <StatusBadge status={appointment.status} size="sm" />
                  </div>
                </div>
              </div>

              {/* Actions Grid */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {actionButtons.map(({ action, icon: Icon, labelKey, color }) => (
                  <button
                    key={action}
                    onClick={() => handleAction(action)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2",
                      "p-4 rounded-xl",
                      "bg-muted/50 hover:bg-muted active:scale-95",
                      "transition-all duration-150"
                    )}
                  >
                    <Icon className={cn("w-6 h-6", color)} />
                    <span className="text-xs font-medium text-foreground">
                      {t(labelKey)}
                    </span>
                  </button>
                ))}
              </div>

              {/* Danger Zone - Cancel Button */}
              <Button
                variant="outline"
                onClick={() => handleAction('cancel')}
                className={cn(
                  "w-full h-12",
                  "border-destructive/50 text-destructive",
                  "hover:bg-destructive/10 hover:border-destructive",
                  "active:scale-[0.98] transition-all"
                )}
              >
                {t('bookings.actions.cancelAppointment')}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default AppointmentBottomSheet;
