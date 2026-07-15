import { CalendarIcon, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/contexts/LanguageContext';
import type { Barber } from '@/types/barber';
import type { TimeEntryStatus } from '@/types/timeEntry';

interface TimeEntryFiltersProps {
  startDate: string;
  endDate: string;
  selectedUserId: string;
  selectedStatus: string;
  barbers: Barber[];
  showEmployeeFilter?: boolean;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  onUserChange: (val: string) => void;
  onStatusChange: (val: string) => void;
  onReset: () => void;
}

export default function TimeEntryFilters({
  startDate,
  endDate,
  selectedUserId,
  selectedStatus,
  barbers,
  showEmployeeFilter = false,
  onStartDateChange,
  onEndDateChange,
  onUserChange,
  onStatusChange,
  onReset,
}: TimeEntryFiltersProps) {
  const { t } = useTranslation();
  const hasFilters = startDate || endDate || selectedUserId || selectedStatus;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Filter className="h-4 w-4" />
        {t('timeTracking.filters.title')}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">{t('timeTracking.filters.from')}</Label>
          <div className="relative">
            <CalendarIcon className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="pl-8 text-xs h-9"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('timeTracking.filters.to')}</Label>
          <div className="relative">
            <CalendarIcon className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="pl-8 text-xs h-9"
            />
          </div>
        </div>
        {showEmployeeFilter && (
          <div className="space-y-1">
            <Label className="text-xs">{t('timeTracking.filters.employee')}</Label>
            <Select value={selectedUserId} onValueChange={onUserChange}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder={t('common.all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {barbers.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-xs">{t('common.status')}</Label>
          <Select value={selectedStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder={t('common.all')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="open">{t('timeTracking.status.open')}</SelectItem>
              <SelectItem value="closed">{t('timeTracking.status.closed')}</SelectItem>
              <SelectItem value="auto_closed">{t('timeTracking.status.autoClosed')}</SelectItem>
              <SelectItem value="corrected">{t('timeTracking.status.corrected')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onReset} className="text-xs">
          {t('timeTracking.filters.clear')}
        </Button>
      )}
    </div>
  );
}
