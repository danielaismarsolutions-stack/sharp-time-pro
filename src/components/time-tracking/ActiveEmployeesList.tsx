import { useState, useEffect } from 'react';
import { Clock, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useActiveSessions } from '@/hooks/useQueryHooks';

function formatElapsed(clockIn: string): string {
  const diff = Date.now() - new Date(clockIn).getTime();
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

export default function ActiveEmployeesList() {
  const { data: sessions = [], isLoading } = useActiveSessions();
  const [, setTick] = useState(0);

  // Refresh elapsed times every 30s
  useEffect(() => {
    if (sessions.length === 0) return;
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, [sessions.length]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          Trabajando ahora
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {sessions.length} {sessions.length === 1 ? 'empleado' : 'empleados'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nadie ha fichado entrada todavia.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session.user_avatar} />
                  <AvatarFallback className="text-xs">
                    {(session.user_name ?? '?').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{session.user_name ?? 'Empleado'}</p>
                  <p className="text-xs text-muted-foreground">
                    Desde las {new Date(session.clock_in).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                  <Clock className="h-3.5 w-3.5" />
                  {formatElapsed(session.clock_in)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
