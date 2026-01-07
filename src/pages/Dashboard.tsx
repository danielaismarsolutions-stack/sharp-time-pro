import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Users, DollarSign, Clock, Plus, UserPlus, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { bookingsApi } from '@/services/api';
import { Booking } from '@/types';
import { cn } from '@/lib/utils';

export default function Dashboard() {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"><UserPlus className="mr-2 h-4 w-4" />Walk-in</Button>
          <Button><Plus className="mr-2 h-4 w-4" />New Appointment</Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalToday}</div>
            <p className="text-xs text-muted-foreground">{stats.completed} completed, {stats.upcoming} upcoming</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.revenue}</div>
            <p className="text-xs text-emerald-400">+12% from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">248</div>
            <p className="text-xs text-muted-foreground">+3 this week</p>
          </CardContent>
        </Card>

        <Card className={cn(nextBooking && 'border-primary/50 glow-primary')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Next Appointment</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {nextBooking ? (
              <>
                <div className="text-2xl font-bold">{nextBooking.time}</div>
                <p className="text-xs text-muted-foreground">{nextBooking.clientName} • {nextBooking.serviceName}</p>
              </>
            ) : (
              <div className="text-muted-foreground">No more appointments today</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Today's Schedule</CardTitle>
          <Button variant="ghost" size="sm">View Calendar <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
            </div>
          ) : todayBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No appointments scheduled for today</div>
          ) : (
            <div className="space-y-3">
              {todayBookings.slice(0, 6).map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[60px]">
                      <div className="text-lg font-semibold">{booking.time}</div>
                      <div className="text-xs text-muted-foreground">{booking.serviceDuration} min</div>
                    </div>
                    <div>
                      <div className="font-medium">{booking.clientName}</div>
                      <div className="text-sm text-muted-foreground">{booking.serviceName} • €{booking.servicePrice}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className={statusColors[booking.status]}>
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
