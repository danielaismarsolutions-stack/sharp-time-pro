import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/i18n';

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'no-show';

interface StatusBadgeProps {
  status: BookingStatus;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const statusConfig: Record<string, { labelKey: TranslationKey; dotClass: string; badgeClass: string }> = {
  pending: {
    labelKey: 'calendar.status.pending',
    dotClass: 'bg-amber-400',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  confirmed: {
    labelKey: 'calendar.status.confirmed',
    dotClass: 'bg-violet-400',
    badgeClass: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  },
  completed: {
    labelKey: 'calendar.status.completed',
    dotClass: 'bg-emerald-400',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  cancelled: {
    labelKey: 'calendar.status.cancelled',
    dotClass: 'bg-rose-400',
    badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  },
  no_show: {
    labelKey: 'calendar.status.noShow',
    dotClass: 'bg-purple-400',
    badgeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  'no-show': {
    labelKey: 'calendar.status.noShow',
    dotClass: 'bg-purple-400',
    badgeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
};

export function StatusBadge({ status, size = 'md', showLabel = true }: StatusBadgeProps) {
  const { t } = useTranslation();
  const config = statusConfig[status];

  if (!showLabel) {
    return (
      <span
        className={cn(
          'rounded-full',
          config.dotClass,
          size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        config.badgeClass,
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      )}
    >
      <span className={cn('rounded-full', config.dotClass, size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
      {t(config.labelKey)}
    </span>
  );
}

export function StatusDot({ status, size = 'md' }: { status: BookingStatus; size?: 'sm' | 'md' }) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        'inline-block rounded-full',
        config.dotClass,
        size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'
      )}
    />
  );
}
