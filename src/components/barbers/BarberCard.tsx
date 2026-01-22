import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Barber, DAY_NAMES } from '@/types/barber';
import { Edit, Calendar, Mail, Phone, Clock } from 'lucide-react';

interface BarberCardProps {
  barber: Barber;
  onEdit: () => void;
  onManageSchedule: () => void;
}

export default function BarberCard({ barber, onEdit, onManageSchedule }: BarberCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getWorkingDays = () => {
    const days = Object.entries(barber.schedule)
      .filter(([_, schedule]) => schedule.enabled)
      .map(([day]) => DAY_NAMES[day as keyof typeof DAY_NAMES].slice(0, 3));
    return days.join(', ');
  };

  const getTotalHours = () => {
    let totalMinutes = 0;
    Object.values(barber.schedule).forEach((day) => {
      if (day.enabled) {
        day.shifts.forEach((shift) => {
          const [startH, startM] = shift.start.split(':').map(Number);
          const [endH, endM] = shift.end.split(':').map(Number);
          totalMinutes += (endH * 60 + endM) - (startH * 60 + startM);
        });
      }
    });
    return Math.round(totalMinutes / 60);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={barber.avatar_url || undefined} alt={barber.name} />
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {getInitials(barber.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg truncate">{barber.name}</h3>
              {!barber.is_active && (
                <Badge variant="secondary" className="text-xs">Inactivo</Badge>
              )}
            </div>

            {barber.bio && (
              <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{barber.bio}</p>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {barber.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{barber.email}</span>
                </span>
              )}
              {barber.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {barber.phone}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {getWorkingDays() || 'Sin días'}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {getTotalHours()}h/semana
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
            <Button variant="ghost" size="sm" onClick={onManageSchedule}>
              <Calendar className="h-4 w-4 mr-1" />
              Horario
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
