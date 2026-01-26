import { useEffect, useState, useCallback, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Users, DollarSign, TrendingUp, Plus, ArrowRight, RefreshCw, Loader2, AlertCircle, Scissors, ArrowUpDown, Filter, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/services/apiClient';
import { ApiBooking } from '@/types/api';
import { cn } from '@/lib/utils';
import { AnimatedCard } from '@/components/ui/animated-card';

type SortField = 'date' | 'client' | 'service' | 'barber' | 'price';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show';

export default function Dashboard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [barberFilter, setBarberFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc'); // Newest first by default

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

  // Get unique barbers for filter dropdown
  const uniqueBarbers = useMemo(() => {
    const barbers = new Set(bookings.map(b => b.barber || 'Sin asignar'));
    return Array.from(barbers).sort();
  }, [bookings]);

  // Filter and sort bookings
  const filteredAndSortedBookings = useMemo(() => {
    let result = [...bookings];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(b =>
        b.client_name.toLowerCase().includes(query) ||
        b.client_phone?.toLowerCase().includes(query) ||
        b.service_name.toLowerCase().includes(query) ||
        (b.barber?.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(b => b.status === statusFilter);
    }

    // Apply barber filter
    if (barberFilter !== 'all') {
      result = result.filter(b => (b.barber || 'Sin asignar') === barberFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'date':
          // Sort by date first, then by time
          const dateA = `${a.booking_date}T${a.start_time}`;
          const dateB = `${b.booking_date}T${b.start_time}`;
          comparison = dateA.localeCompare(dateB);
          break;
        case 'client':
          comparison = a.client_name.localeCompare(b.client_name);
          break;
        case 'service':
          comparison = a.service_name.localeCompare(b.service_name);
          break;
        case 'barber':
          comparison = (a.barber || '').localeCompare(b.barber || '');
          break;
        case 'price':
          comparison = a.service_price - b.service_price;
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [bookings, searchQuery, statusFilter, barberFilter, sortField, sortOrder]);

  // Toggle sort order or change field
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setBarberFilter('all');
    setSortField('date');
    setSortOrder('desc');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || barberFilter !== 'all';

  // Calculate stats
  const stats = {
    totalBookings: bookings.length,
    confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
    todayRevenue: bookings.reduce((sum, b) => sum + b.service_price, 0),
    averagePrice: bookings.length > 0 
      ? bookings.reduce((sum, b) => sum + b.service_price, 0) / bookings.length 
      : 0,
  };

  // Calculate stats per barber
  const barberStats = bookings.reduce((acc, booking) => {
    const barberName = booking.barber || 'Sin asignar';
    if (!acc[barberName]) {
      acc[barberName] = { totalBookings: 0, totalRevenue: 0 };
    }
    acc[barberName].totalBookings += 1;
    acc[barberName].totalRevenue += booking.service_price;
    return acc;
  }, {} as Record<string, { totalBookings: number; totalRevenue: number }>);

  const barberStatsList = Object.entries(barberStats)
    .map(([name, data]) => ({
      name,
      totalBookings: data.totalBookings,
      totalRevenue: data.totalRevenue,
      averagePrice: data.totalBookings > 0 ? data.totalRevenue / data.totalBookings : 0,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

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

      {/* Barber Stats */}
      {barberStatsList.length > 0 && (
        <AnimatedCard delay={4}>
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <Scissors className="h-5 w-5" />
                Estadísticas por Barbero
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {barberStatsList.map((barber, index) => (
                  <motion.div
                    key={barber.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="font-semibold text-sm md:text-base mb-3">{barber.name}</div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg md:text-xl font-bold text-primary">{barber.totalBookings}</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground">Citas</div>
                      </div>
                      <div>
                        <div className="text-lg md:text-xl font-bold text-emerald-500">€{barber.totalRevenue.toFixed(0)}</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground">Ingresos</div>
                      </div>
                      <div>
                        <div className="text-lg md:text-xl font-bold">€{barber.averagePrice.toFixed(0)}</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground">Promedio</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>
      )}

      {/* Bookings Table */}
      <AnimatedCard delay={4}>
        <Card>
          <CardHeader className="p-4 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base md:text-lg">
                Listado de Citas
                {filteredAndSortedBookings.length !== bookings.length && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({filteredAndSortedBookings.length} de {bookings.length})
                  </span>
                )}
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-9 min-h-[44px] px-2 md:px-3" onClick={() => navigate('/calendar')}>
                <span className="hidden sm:inline">Ver Calendario</span>
                <span className="sm:hidden">Ver</span>
                <ArrowRight className="ml-1 md:ml-2 h-4 w-4" />
              </Button>
            </div>
            
            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Input
                  placeholder="Buscar cliente, servicio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pr-8"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-full sm:w-[160px] h-10">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="confirmed">Confirmada</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                  <SelectItem value="no_show">No asistió</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Barber Filter */}
              <Select value={barberFilter} onValueChange={setBarberFilter}>
                <SelectTrigger className="w-full sm:w-[160px] h-10">
                  <SelectValue placeholder="Barbero" />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg z-50">
                  <SelectItem value="all">Todos los barberos</SelectItem>
                  {uniqueBarbers.map((barber) => (
                    <SelectItem key={barber} value={barber}>{barber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="h-10 min-h-[44px]">
                  <X className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-0 md:p-6 md:pt-0">
            {filteredAndSortedBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {hasActiveFilters ? 'No se encontraron citas con los filtros aplicados' : 'No hay citas registradas'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead 
                        className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => handleSort('client')}
                      >
                        <div className="flex items-center gap-1">
                          Cliente
                          <ArrowUpDown className={cn("h-3 w-3", sortField === 'client' && "text-primary")} />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => handleSort('service')}
                      >
                        <div className="flex items-center gap-1">
                          Servicio
                          <ArrowUpDown className={cn("h-3 w-3", sortField === 'service' && "text-primary")} />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => handleSort('barber')}
                      >
                        <div className="flex items-center gap-1">
                          Barbero
                          <ArrowUpDown className={cn("h-3 w-3", sortField === 'barber' && "text-primary")} />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => handleSort('date')}
                      >
                        <div className="flex items-center gap-1">
                          Fecha y Hora
                          <ArrowUpDown className={cn("h-3 w-3", sortField === 'date' && "text-primary")} />
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-center">Duración</TableHead>
                      <TableHead 
                        className="font-semibold text-right cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => handleSort('price')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Precio
                          <ArrowUpDown className={cn("h-3 w-3", sortField === 'price' && "text-primary")} />
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredAndSortedBookings.map((booking, index) => (
                        <motion.tr
                          key={booking.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: Math.min(index * 0.02, 0.3) }}
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
