import { useState, useEffect } from 'react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import {
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { analyticsApi, bookingsApi, clientsApi } from '@/services/api';
import { AnalyticsData, Booking, Client } from '@/types';
import { useToast } from '@/hooks/use-toast';

type Period = 'week' | 'month' | 'quarter' | 'year';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Reports() {
  const { toast } = useToast();
  const [period, setPeriod] = useState<Period>('month');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [analyticsData, bookingsData, clientsData] = await Promise.all([
        analyticsApi.getAnalytics(),
        bookingsApi.getAll(),
        clientsApi.getAll(),
      ]);
      setAnalytics(analyticsData);
      setBookings(bookingsData);
      setClients(clientsData);
    } catch (error) {
      toast({ title: 'Error al cargar analíticas', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate metrics based on period
  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'week':
        return { start: subDays(now, 7), end: now };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'quarter':
        return { start: subDays(now, 90), end: now };
      case 'year':
        return { start: subDays(now, 365), end: now };
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const { start, end } = getDateRange();
    const bookingDate = new Date(b.date);
    return bookingDate >= start && bookingDate <= end;
  });

  const completedBookings = filteredBookings.filter((b) => b.status === 'completed');
  const cancelledBookings = filteredBookings.filter((b) => b.status === 'cancelled');
  const noShowBookings = filteredBookings.filter((b) => b.status === 'no-show');

  const totalRevenue = completedBookings.reduce((sum, b) => sum + b.servicePrice, 0);
  const completionRate = filteredBookings.length > 0
    ? Math.round((completedBookings.length / filteredBookings.length) * 100)
    : 0;
  const cancellationRate = filteredBookings.length > 0
    ? Math.round((cancelledBookings.length / filteredBookings.length) * 100)
    : 0;
  const noShowRate = filteredBookings.length > 0
    ? Math.round((noShowBookings.length / filteredBookings.length) * 100)
    : 0;

  // Revenue by service
  const revenueByService = completedBookings.reduce((acc, b) => {
    acc[b.serviceName] = (acc[b.serviceName] || 0) + b.servicePrice;
    return acc;
  }, {} as Record<string, number>);

  const serviceChartData = Object.entries(revenueByService)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Revenue trend (last 7 days)
  const revenueTrend = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayBookings = completedBookings.filter((b) =>
      format(new Date(b.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    return {
      date: format(date, 'EEE'),
      revenue: dayBookings.reduce((sum, b) => sum + b.servicePrice, 0),
      bookings: dayBookings.length,
    };
  });

  // Status distribution
  const statusData = [
    { name: 'Completadas', value: completedBookings.length, color: '#10b981' },
    { name: 'Pendientes', value: filteredBookings.filter((b) => b.status === 'pending').length, color: '#f59e0b' },
    { name: 'Confirmadas', value: filteredBookings.filter((b) => b.status === 'confirmed').length, color: '#3b82f6' },
    { name: 'Canceladas', value: cancelledBookings.length, color: '#ef4444' },
    { name: 'No asistió', value: noShowBookings.length, color: '#6b7280' },
  ].filter((d) => d.value > 0);

  // Top clients
  const topClients = [...clients]
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  // Busiest hours
  const bookingsByHour = completedBookings.reduce((acc, b) => {
    const hour = parseInt(b.time.split(':')[0]);
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const hoursChartData = Array.from({ length: 12 }, (_, i) => ({
    hour: `${i + 8}:00`,
    bookings: bookingsByHour[i + 8] || 0,
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Informes</h1>
          <p className="text-muted-foreground text-sm">Resumen del rendimiento del negocio</p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="h-10">
            <TabsTrigger value="week" className="text-xs md:text-sm px-2 md:px-3 min-h-[36px]">Semana</TabsTrigger>
            <TabsTrigger value="month" className="text-xs md:text-sm px-2 md:px-3 min-h-[36px]">Mes</TabsTrigger>
            <TabsTrigger value="quarter" className="text-xs md:text-sm px-2 md:px-3 min-h-[36px]">Trim.</TabsTrigger>
            <TabsTrigger value="year" className="text-xs md:text-sm px-2 md:px-3 min-h-[36px]">Año</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPI Cards - 2x2 on mobile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Ingresos
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <p className="text-xl md:text-2xl font-bold">€{totalRevenue.toLocaleString()}</p>
            <div className="flex items-center gap-1 text-xs md:text-sm text-status-success">
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
              <span>+12%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Citas
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <p className="text-xl md:text-2xl font-bold">{filteredBookings.length}</p>
            <p className="text-[10px] md:text-sm text-muted-foreground">
              {completedBookings.length} completadas
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Completadas
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <p className="text-xl md:text-2xl font-bold text-status-success">{completionRate}%</p>
            <p className="text-[10px] md:text-sm text-muted-foreground">
              {cancellationRate}% canceladas
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Prom./Cita
            </CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <p className="text-xl md:text-2xl font-bold">
              €{completedBookings.length > 0 ? Math.round(totalRevenue / completedBookings.length) : 0}
            </p>
            <p className="text-[10px] md:text-sm text-muted-foreground">
              {clients.length} clientes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row - stack on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Revenue Trend */}
        <Card className="border-border">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base md:text-lg">Tendencia de Ingresos</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <div className="h-[200px] md:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Service */}
        <Card className="border-border">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base md:text-lg">Por Servicio</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <div className="h-[200px] md:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviceChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={80} fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row - stack on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Booking Status */}
        <Card className="border-border">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base md:text-lg">Estado</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <div className="h-[180px] md:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Busiest Hours */}
        <Card className="border-border">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base md:text-lg">Horas Más Ocupadas</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <div className="h-[180px] md:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hoursChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={9} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="bookings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card className="border-border md:col-span-2 lg:col-span-1">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base md:text-lg">Mejores Clientes</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <div className="space-y-3 md:space-y-4">
              {topClients.map((client, index) => (
                <div key={client.id} className="flex items-center gap-3 min-h-[44px]">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{client.name}</p>
                    <p className="text-xs text-muted-foreground">{client.totalVisits} visitas</p>
                  </div>
                  <p className="font-bold text-sm shrink-0">€{client.totalSpent}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
