import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check } from 'lucide-react';
import { ConsultationStatus, STATUS_CONFIG } from '@/types/consultation';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';

interface StatusDropdownProps {
  currentStatus: ConsultationStatus;
  onStatusChange: (status: ConsultationStatus) => void;
  disabled?: boolean;
}

const statuses: ConsultationStatus[] = ['new', 'contacted', 'scheduled', 'completed', 'cancelled'];

export function StatusDropdown({ currentStatus, onStatusChange, disabled }: StatusDropdownProps) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-1 min-h-[40px] md:min-h-0">
          {t('common.status')}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover">
        {statuses.map((status) => {
          const config = STATUS_CONFIG[status];
          const isActive = status === currentStatus;
          
          return (
            <DropdownMenuItem
              key={status}
              onClick={() => onStatusChange(status)}
              className={cn('gap-2', isActive && 'bg-muted')}
            >
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  status === 'new' && 'bg-yellow-500',
                  status === 'contacted' && 'bg-blue-500',
                  status === 'scheduled' && 'bg-purple-500',
                  status === 'completed' && 'bg-green-500',
                  status === 'cancelled' && 'bg-gray-400'
                )}
              />
              {t(config.labelKey)}
              {isActive && <Check className="h-4 w-4 ml-auto" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
