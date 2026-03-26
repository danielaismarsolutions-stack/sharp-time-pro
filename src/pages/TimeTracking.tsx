import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { Fingerprint } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useTimeTrackingSettings, useTimeEntries, useBarbers } from '@/hooks/useQueryHooks';
import ClockInOutButton from '@/components/time-tracking/ClockInOutButton';
import ActiveEmployeesList from '@/components/time-tracking/ActiveEmployeesList';
import TimeSummaryCards from '@/components/time-tracking/TimeSummaryCards';
import TimeEntryTable from '@/components/time-tracking/TimeEntryTable';
import TimeEntryFilters from '@/components/time-tracking/TimeEntryFilters';
import type { TimeEntryStatus } from '@/types/timeEntry';

function getDefaultStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function getDefaultEndDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function TimeTracking() {
  const { user, isAdmin } = useAuth();
  const { data: settings, isLoading: isLoadingSettings } = useTimeTrackingSettings();
  const { data: barbers = [] } = useBarbers(true);

  // Filters
  const [startDate, setStartDate] = useState(getDefaultStartDate);
  const [endDate, setEndDate] = useState(getDefaultEndDate);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const filters = useMemo(() => ({
    start_date: startDate ? `${startDate}T00:00:00` : undefined,
    end_date: endDate ? `${endDate}T23:59:59` : undefined,
    user_id: isAdmin ? (selectedUserId && selectedUserId !== 'all' ? selectedUserId : undefined) : user?.id,
    status: (selectedStatus && selectedStatus !== 'all' ? selectedStatus : undefined) as TimeEntryStatus | undefined,
  }), [startDate, endDate, selectedUserId, selectedStatus, isAdmin, user?.id]);

  const { data: entries = [], isLoading: isLoadingEntries } = useTimeEntries(filters);

  const resetFilters = () => {
    setStartDate(getDefaultStartDate());
    setEndDate(getDefaultEndDate());
    setSelectedUserId('');
    setSelectedStatus('');
  };

  // Redirect if feature disabled
  if (!isLoadingSettings && !settings?.timeTrackingEnabled) {
    return <Navigate to="/calendar" replace />;
  }

  if (isLoadingSettings) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Fingerprint className="h-6 w-6" />
          Fichajes
        </h1>
        <p className="text-muted-foreground text-sm">
          {isAdmin ? 'Controla las horas trabajadas de tu equipo' : 'Registra tu entrada y salida'}
        </p>
      </div>

      {/* Clock In/Out Button */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <ClockInOutButton />
        </CardContent>
      </Card>

      {/* Admin: Active employees */}
      {isAdmin && <ActiveEmployeesList />}

      {/* Summary cards - show user's own entries for barbers, all for admin */}
      <TimeSummaryCards entries={entries} />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <TimeEntryFilters
            startDate={startDate}
            endDate={endDate}
            selectedUserId={selectedUserId}
            selectedStatus={selectedStatus}
            barbers={barbers}
            showEmployeeFilter={isAdmin}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onUserChange={setSelectedUserId}
            onStatusChange={setSelectedStatus}
            onReset={resetFilters}
          />
        </CardContent>
      </Card>

      {/* Time entries table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Historial de fichajes
            {!isLoadingEntries && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({entries.length} {entries.length === 1 ? 'registro' : 'registros'})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-0">
          {isLoadingEntries ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <TimeEntryTable
              entries={entries}
              showEmployee={isAdmin}
              isAdmin={isAdmin}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
