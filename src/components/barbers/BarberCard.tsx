import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Barber, DAY_NAMES } from '@/types/barber';
import { Edit, Calendar, Mail, Phone, Clock, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
    >
      <Card className="hover:shadow-md transition-shadow active:bg-muted/30">
        <CardContent className="p-3 sm:p-4">
          {/* Mobile Layout - Stacked with full-width action buttons */}
          <div className="flex flex-col gap-3 sm:hidden">
            {/* Top row: Avatar + Info */}
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12 flex-shrink-0">
                <AvatarImage src={barber.avatar_url || undefined} alt={barber.name} />
                <AvatarFallback className="text-base bg-primary/10 text-primary font-semibold">
                  {getInitials(barber.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-base truncate">{barber.name}</h3>
                  {(barber.role === 'admin' || barber.role === 'owner') && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">
                      {barber.role === 'owner' ? 'Owner' : 'Admin'}
                    </Badge>
                  )}
                  {!barber.is_active && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Inactivo</Badge>
                  )}
                </div>

                {barber.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-1 mb-1.5">{barber.bio}</p>
                )}

                {/* Contact info */}
                <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                  {barber.email && (
                    <span className="flex items-center gap-1.5 truncate">
                      <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{barber.email}</span>
                    </span>
                  )}
                  {barber.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                      {barber.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Schedule summary bar */}
            <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">{getWorkingDays() || 'Sin días'}</span>
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="font-medium">{getTotalHours()}h/sem</span>
              </span>
            </div>

            {/* Full-width action buttons - touch friendly 44px height */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="default"
                className="flex-1 h-11 text-sm font-medium"
                onClick={onEdit}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar Perfil
              </Button>
              <Button 
                variant="default"
                size="default"
                className="flex-1 h-11 text-sm font-medium"
                onClick={onManageSchedule}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Horario
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* Desktop Layout - Original horizontal */}
          <div className="hidden sm:flex items-start gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={barber.avatar_url || undefined} alt={barber.name} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {getInitials(barber.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg truncate">{barber.name}</h3>
                {(barber.role === 'admin' || barber.role === 'owner') && (
                  <Badge variant="default" className="text-xs">
                    {barber.role === 'owner' ? 'Owner' : 'Admin'}
                  </Badge>
                )}
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
    </motion.div>
  );
}