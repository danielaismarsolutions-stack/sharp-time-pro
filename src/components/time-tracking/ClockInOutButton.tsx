import { useState, useEffect } from 'react';
import { LogIn, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useActiveSession, useClockIn, useClockOut } from '@/hooks/useQueryHooks';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { notifyAllAdmins } from '@/services/supabaseNotifications';
import { getBusinessId } from '@/config/session';
import type { TimeEntry } from '@/types/timeEntry';

function formatElapsed(clockIn: string): string {
  const diff = Date.now() - new Date(clockIn).getTime();
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

interface ClockInOutButtonProps {
  compact?: boolean;
}

export default function ClockInOutButton({ compact = false }: ClockInOutButtonProps) {
  const { user } = useAuth();
  const { t, intlLocale } = useTranslation();
  const { toast } = useToast();
  const { data: activeSession, isLoading } = useActiveSession(user?.id);
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const [elapsed, setElapsed] = useState('');

  const isClockedIn = !!activeSession;
  const isMutating = clockIn.isPending || clockOut.isPending;

  // Live elapsed timer
  useEffect(() => {
    if (!activeSession) {
      setElapsed('');
      return;
    }
    setElapsed(formatElapsed(activeSession.clock_in));
    const interval = setInterval(() => {
      setElapsed(formatElapsed(activeSession.clock_in));
    }, 30_000); // update every 30 seconds
    return () => clearInterval(interval);
  }, [activeSession]);

  const handleClick = () => {
    if (!user) return;

    if (isClockedIn) {
      clockOut.mutate(
        { entryId: (activeSession as TimeEntry).id },
        {
          onSuccess: () => {
            toast({
              title: t('timeTracking.clock.clockedOutTitle'),
              description: t('timeTracking.clock.clockedOutDescription', { elapsed }),
            });
            // Notify admins (fire-and-forget)
            notifyAllAdmins({
              business_id: getBusinessId(),
              type: 'time_entry_clock_out',
              title: t('timeTracking.clock.clockOutNotificationTitle'),
              message: t('timeTracking.clock.clockOutNotificationMessage', { name: user.name, elapsed }),
              performed_by_user_id: user.id,
            });
          },
          onError: (err) => toast({ title: t('common.error'), description: err.message, variant: 'destructive' }),
        }
      );
    } else {
      clockIn.mutate(
        { userId: user.id },
        {
          onSuccess: () => {
            toast({
              title: t('timeTracking.clock.clockedInTitle'),
              description: t('timeTracking.clock.clockedInDescription'),
            });
            // Notify admins (fire-and-forget)
            notifyAllAdmins({
              business_id: getBusinessId(),
              type: 'time_entry_clock_in',
              title: t('timeTracking.clock.clockInNotificationTitle'),
              message: t('timeTracking.clock.clockInNotificationMessage', { name: user.name }),
              performed_by_user_id: user.id,
            });
          },
          onError: (err) => toast({ title: t('common.error'), description: err.message, variant: 'destructive' }),
        }
      );
    }
  };

  if (isLoading) {
    return (
      <Button disabled size={compact ? 'default' : 'lg'} className="w-full">
        <Loader2 className="h-5 w-5 animate-spin" />
      </Button>
    );
  }

  if (compact) {
    return (
      <Button
        onClick={handleClick}
        disabled={isMutating}
        variant={isClockedIn ? 'destructive' : 'default'}
        className={`w-full ${isClockedIn ? '' : 'bg-green-600 hover:bg-green-700'}`}
      >
        {isMutating ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : isClockedIn ? (
          <LogOut className="h-4 w-4 mr-2" />
        ) : (
          <LogIn className="h-4 w-4 mr-2" />
        )}
        {isClockedIn
          ? t('timeTracking.clock.clockOutWithElapsed', { elapsed })
          : t('timeTracking.clock.clockIn')}
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <Button
        onClick={handleClick}
        disabled={isMutating}
        size="lg"
        variant={isClockedIn ? 'destructive' : 'default'}
        className={`w-full max-w-sm h-16 text-lg font-semibold ${isClockedIn ? '' : 'bg-green-600 hover:bg-green-700'}`}
      >
        {isMutating ? (
          <Loader2 className="h-6 w-6 animate-spin mr-3" />
        ) : isClockedIn ? (
          <LogOut className="h-6 w-6 mr-3" />
        ) : (
          <LogIn className="h-6 w-6 mr-3" />
        )}
        {isClockedIn ? t('timeTracking.clock.clockOut') : t('timeTracking.clock.clockIn')}
      </Button>
      {isClockedIn && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {t('timeTracking.clock.workingSince', {
              time: new Date(activeSession!.clock_in).toLocaleTimeString(intlLocale, { hour: '2-digit', minute: '2-digit' }),
            })}
          </p>
          <p className="text-2xl font-bold text-primary">{elapsed}</p>
        </div>
      )}
      {!isClockedIn && (
        <p className="text-sm text-muted-foreground">{t('timeTracking.clock.notClockedInToday')}</p>
      )}
    </div>
  );
}
