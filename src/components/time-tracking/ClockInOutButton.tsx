import { useState, useEffect } from 'react';
import { LogIn, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useActiveSession, useClockIn, useClockOut } from '@/hooks/useQueryHooks';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
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
          onSuccess: () => toast({ title: 'Salida fichada', description: `Has trabajado ${elapsed}` }),
          onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
        }
      );
    } else {
      clockIn.mutate(
        { userId: user.id },
        {
          onSuccess: () => toast({ title: 'Entrada fichada', description: 'Tu jornada ha comenzado.' }),
          onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
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
        {isClockedIn ? `Fichar Salida (${elapsed})` : 'Fichar Entrada'}
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
        {isClockedIn ? 'Fichar Salida' : 'Fichar Entrada'}
      </Button>
      {isClockedIn && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Trabajando desde las {new Date(activeSession!.clock_in).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
          <p className="text-2xl font-bold text-primary">{elapsed}</p>
        </div>
      )}
      {!isClockedIn && (
        <p className="text-sm text-muted-foreground">No has fichado entrada hoy</p>
      )}
    </div>
  );
}
