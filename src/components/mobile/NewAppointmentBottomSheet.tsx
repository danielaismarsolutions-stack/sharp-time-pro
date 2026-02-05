// Bottom sheet for selecting appointment type after time slot selection
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, Menu, Circle, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AppointmentType = 'service' | 'class' | 'event';

interface NewAppointmentBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: AppointmentType) => void;
  selectedTime?: {
    date: Date;
    startTime: string;
    endTime: string;
  };
}

const appointmentOptions = [
  {
    type: 'service' as const,
    label: 'Servicio',
    description: 'Reserva de servicio individual',
    icon: Menu, // 3 horizontal lines
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
  },
  {
    type: 'class' as const,
    label: 'Clase',
    description: 'Clase grupal o taller',
    icon: Circle, // Concentric circles icon represented by Circle
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50 hover:bg-emerald-100',
  },
  {
    type: 'event' as const,
    label: 'Evento',
    description: 'Evento especial o bloqueo',
    icon: Square, // Calendar/square icon
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 hover:bg-amber-100',
  },
];

export function NewAppointmentBottomSheet({
  isOpen,
  onClose,
  onSelectType,
  selectedTime,
}: NewAppointmentBottomSheetProps) {
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Close if dragged down more than 100px or with velocity
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
              stiffness: 300,
              mass: 0.8,
            }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className={cn(
              'fixed inset-x-0 bottom-0 z-50',
              'bg-background border-t border-border',
              'rounded-t-[20px] shadow-2xl',
              'pb-safe'
            )}
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
          >
            {/* Drag Handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1.5 bg-muted-foreground/30 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4">
              {/* Close button */}
              <button
                onClick={onClose}
                className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>

              {/* Title */}
              <div className="flex-1 text-center">
                <h2 className="font-semibold text-lg">Nueva cita</h2>
                {selectedTime && (
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedTime.date)} · {formatTime(selectedTime.startTime)} - {formatTime(selectedTime.endTime)}
                  </p>
                )}
              </div>

              {/* Placeholder for symmetry */}
              <div className="w-9" />
            </div>

            {/* Options List */}
            <div className="px-5 pb-6 space-y-3">
              {appointmentOptions.map(({ type, label, description, icon: Icon, color, bgColor }) => (
                <button
                  key={type}
                  onClick={() => onSelectType(type)}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-xl',
                    'transition-all duration-150 active:scale-[0.98]',
                    bgColor
                  )}
                >
                  <div className={cn('p-2 rounded-lg bg-background shadow-sm', color)}>
                    <Icon className="w-6 h-6" strokeWidth={2} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground">{label}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                  <div className="text-muted-foreground">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M7 5l5 5-5 5" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default NewAppointmentBottomSheet;
