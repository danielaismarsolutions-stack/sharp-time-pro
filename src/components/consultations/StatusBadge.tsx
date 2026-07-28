import { cn } from '@/lib/utils';
import { ConsultationStatus, STATUS_CONFIG } from '@/types/consultation';
import { useTranslation } from '@/contexts/LanguageContext';

interface StatusBadgeProps {
  status: ConsultationStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation();
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
      {t(config.labelKey)}
    </span>
  );
}
