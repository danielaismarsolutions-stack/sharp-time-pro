import { cn } from '@/lib/utils';
import { ConsultationStatus, STATUS_CONFIG } from '@/types/consultation';

interface StatusBadgeProps {
  status: ConsultationStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.bgColor,
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  );
}
