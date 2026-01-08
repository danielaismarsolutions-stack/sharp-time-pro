import { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Users, DollarSign, TrendingUp, Plus, ArrowRight, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiClient } from '@/services/apiClient';
import { ApiBooking } from '@/types/api';
import { cn } from '@/lib/utils';
import { AnimatedCard } from '@/components/ui/animated-card';

export default function Dashboard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadBookings = useCallback(async () => {
    try {
      setError(null);
      const data = await apiClient.bookings.getAll();
      setBookings(data);
      console.log('✅ Bookings loaded:', data);
    } catch (err) {
      console.error('❌ Error loading bookings:', err);
      setError('No se pudieron cargar las citas. Por favor, intente de nuevo.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadBookings();
  };

  // Calculate stats
  const stats = {
    totalBookings: bookings.length,
    confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
    todayRevenue: bookings.reduce((sum, b) => sum + b.service_price, 0),
    averagePrice: bookings.length > 0 
      ? bookings.reduce((sum, b) => sum + b.service_price, 0) / bookings.length 
      : 0,
  };

  // Status badge colors and labels
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { class: string; label: string }> = {
      confirmed: { class: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', label: 'Confirmada' },
      pending: { class: 'bg-amber-500/10 text-amber-500 border-amber-500/20', label: 'Pendiente' },
      completed: { class: 'bg-blue-500/10 text-blue-500 border-blue-500/20', label: 'Completada' },
      cancelled: { class: 'bg-red-500/10 text-red-500 border-red-500/20', label: 'Cancelada' },
      no_show: { class: 'bg-gray-500/10 text-gray-500 border-gray-500/20', label: 'No asistió' },
    };
    return statusConfig[status] || { class: 'bg-gray-500/10 text-gray-500', label: status };
  };

  // Format time (HH:mm:ss -> HH:mm)
  const formatTime = (time: string) => time.slice(0, 5);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground text-lg">Cargando citas...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4">
        <div className="rounded-full bg-destructive/10 p-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold text-center">Error al cargar</h2>
        <p className="text-muted-foreground text-center max-w-md">{error}</p>
        <Button onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Reintentando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 md:p-6 space-y-4 md:space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold">Panel de Control</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2 md:gap-3"
        >
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 sm:flex-none h-11 min-h-[44px]"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
          <Button size="sm" className="flex-1 sm:flex-none h-11 min-h-[44px]" onClick={() => navigate('/calendar')}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Nueva Cita</span>
            <span className="sm:hidden">Nueva</span>
          </Button>
        </motion.div>
      </div>

      {/* Stats Cards - 4 cards grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <AnimatedCard delay={0}>
          <Card className="touch-manipulation h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Total Citas</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold">{stats.totalBookings}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">reservas totales</p>
            </CardContent>
          </Card>
        </AnimatedCard>

        <AnimatedCard delay={1}>
          <Card className="touch-manipulation h-full border-emerald-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Confirmadas</CardTitle>
              <Users className="h-4 w-4 text-emerald-500 hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold text-emerald-500">{stats.confirmedBookings}</div>
              <p className="text-[10px] md:text-xs text-emerald-500/70">citas confirmadas</p>
            </CardContent>
          </Card>
        </AnimatedCard>

        <AnimatedCard delay={2}>
          <Card className="touch-manipulation h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Ingresos</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold">€{stats.todayRevenue.toFixed(2)}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">ingresos totales</p>
            </CardContent>
          </Card>
        </AnimatedCard>

        <AnimatedCard delay={3}>
          <Card className="touch-manipulation h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Promedio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold">€{stats.averagePrice.toFixed(2)}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">precio promedio</p>
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>

      {/* Bookings Table */}
      <AnimatedCard delay={4}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-4 md:p-6">
            <CardTitle className="text-base md:text-lg">Listado de Citas</CardTitle>
            <Button variant="ghost" size="sm" className="h-9 min-h-[44px] px-2 md:px-3" onClick={() => navigate('/calendar')}>
              <span className="hidden sm:inline">Ver Calendario</span>
              <span className="sm:hidden">Ver</span>
              <ArrowRight className="ml-1 md:ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            {bookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay citas registradas
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Cliente</TableHead>
                      <TableHead className="font-semibold">Servicio</TableHead>
                      <TableHead className="font-semibold">Barbero</TableHead>
                      <TableHead className="font-semibold">Fecha y Hora</TableHead>
                      <TableHead className="font-semibold text-center">Duración</TableHead>
                      <TableHead className="font-semibold text-right">Precio</TableHead>
                      <TableHead className="font-semibold text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {bookings.map((booking, index) => (
                        <motion.tr
                          key={booking.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <TableCell>
                            <div className="font-medium">{booking.client_name}</div>
                            <div className="text-xs text-muted-foreground">{booking.client_phone}</div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {booking.service_name}
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">{booking.barber || '—'}</span>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {format(new Date(booking.booking_date), "d MMM yyyy", { locale: es })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-muted-foreground">{booking.service_duration} min</span>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            €{booking.service_price.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", getStatusBadge(booking.status).class)}
                            >
                              {getStatusBadge(booking.status).label}
                            </Badge>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </AnimatedCard>
    </motion.div>
  );
}
