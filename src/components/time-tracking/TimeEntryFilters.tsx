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
  const hasFilters = startDate || endDate || selectedUserId || selectedStatus;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Filter className="h-4 w-4" />
        Filtros
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Desde</Label>
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
          <Label className="text-xs">Hasta</Label>
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
            <Label className="text-xs">Empleado</Label>
            <Select value={selectedUserId} onValueChange={onUserChange}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {barbers.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-xs">Estado</Label>
          <Select value={selectedStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="open">Abierto</SelectItem>
              <SelectItem value="closed">Cerrado</SelectItem>
              <SelectItem value="auto_closed">Auto-cerrado</SelectItem>
              <SelectItem value="corrected">Corregido</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onReset} className="text-xs">
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
