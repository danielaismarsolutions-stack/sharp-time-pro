import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, DollarSign, Clock, Plus, UserPlus, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { bookingsApi } from '@/services/api';
import { Booking } from '@/types';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const navigate = useNavigate();
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const bookings = await bookingsApi.getAll({ date: today });
        setTodayBookings(bookings);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [today]);

  const stats = {
    totalToday: todayBookings.length,
    completed: todayBookings.filter(b => b.status === 'completed').length,
    upcoming: todayBookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length,
    revenue: todayBookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.servicePrice, 0),
  };

  const nextBooking = todayBookings
    .filter(b => b.status === 'confirmed' || b.status === 'pending')
    .sort((a, b) => a.time.localeCompare(b.time))[0];

  const statusColors: Record<string, string> = {
    pending: 'status-pending',
    confirmed: 'status-confirmed',
    completed: 'status-completed',
    cancelled: 'status-cancelled',
    'no-show': 'status-noshow',
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm md:text-base">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex gap-2 md:gap-3">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none h-11 min-h-[44px]">
            <UserPlus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Walk-in</span>
            <span className="sm:hidden">Walk-in</span>
          </Button>
          <Button size="sm" className="flex-1 sm:flex-none h-11 min-h-[44px]" onClick={() => navigate('/calendar')}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">New Appointment</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards - 2x2 grid on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="touch-manipulation">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Today's Appts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{stats.totalToday}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">{stats.completed} done, {stats.upcoming} left</p>
          </CardContent>
        </Card>

        <Card className="touch-manipulation">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">€{stats.revenue}</div>
            <p className="text-[10px] md:text-xs text-emerald-400">+12% from yesterday</p>
          </CardContent>
        </Card>

        <Card className="touch-manipulation">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">248</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">+3 this week</p>
          </CardContent>
        </Card>

        <Card className={cn('touch-manipulation', nextBooking && 'border-primary/50 glow-primary')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Next</CardTitle>
            <Clock className="h-4 w-4 text-primary hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            {nextBooking ? (
              <>
                <div className="text-xl md:text-2xl font-bold">{nextBooking.time}</div>
                <p className="text-[10px] md:text-xs text-muted-foreground truncate">{nextBooking.clientName}</p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No more today</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-4 md:p-6">
          <CardTitle className="text-base md:text-lg">Today's Schedule</CardTitle>
          <Button variant="ghost" size="sm" className="h-9 min-h-[44px] px-2 md:px-3" onClick={() => navigate('/calendar')}>
            <span className="hidden sm:inline">View Calendar</span>
            <span className="sm:hidden">View</span>
            <ArrowRight className="ml-1 md:ml-2 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
            </div>
          ) : todayBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No appointments scheduled for today</div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {todayBookings.slice(0, 6).map((booking) => (
                <div 
                  key={booking.id} 
                  className="flex items-center justify-between p-3 md:p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors touch-manipulation active:bg-muted min-h-[64px]"
                >
                  <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                    <div className="text-center min-w-[50px] md:min-w-[60px]">
                      <div className="text-base md:text-lg font-semibold">{booking.time}</div>
                      <div className="text-[10px] md:text-xs text-muted-foreground">{booking.serviceDuration}m</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm md:text-base truncate">{booking.clientName}</div>
                      <div className="text-xs md:text-sm text-muted-foreground truncate">{booking.serviceName} • €{booking.servicePrice}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn('text-[10px] md:text-xs shrink-0 ml-2', statusColors[booking.status])}>
                    {booking.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
