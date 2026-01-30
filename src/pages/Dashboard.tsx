import { useEffect, useState, useCallback, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Users, DollarSign, TrendingUp, Plus, ArrowRight, RefreshCw, Loader2, AlertCircle, Scissors, ArrowUpDown, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, Clock, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/services/apiClient';
import { ApiBooking } from '@/types/api';
import { cn } from '@/lib/utils';
import { AnimatedCard } from '@/components/ui/animated-card';
import { useIsMobile } from '@/hooks/use-mobile';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type SortField = 'date' | 'client' | 'service' | 'barber' | 'price';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show';

export default function Dashboard() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [barberFilter, setBarberFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc'); // Newest first by default
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(isMobile ? 10 : 15);

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

  // Pagination calculations
  const totalItems = filteredAndSortedBookings.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedBookings = filteredAndSortedBookings.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, barberFilter, sortField, sortOrder, pageSize]);

  // Toggle sort order or change field
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setBarberFilter('all');
    setSortField('date');
    setSortOrder('desc');
    setCurrentPage(1);
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
        <Button onClick={handleRefresh} disabled={isRefreshing} className="h-11 min-h-[44px]">
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

  // Mobile booking card component
  const MobileBookingCard = ({ booking, index }: { booking: ApiBooking; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.15) }}
      className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{booking.client_name}</div>
          <div className="text-xs text-muted-foreground">{booking.client_phone}</div>
        </div>
        <Badge 
          variant="outline" 
          className={cn("text-[10px] px-1.5 py-0.5 shrink-0", getStatusBadge(booking.status).class)}
        >
          {getStatusBadge(booking.status).label}
        </Badge>
      </div>
      
      <div className="text-sm font-medium text-primary mb-2">{booking.service_name}</div>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(booking.booking_date), "d MMM", { locale: es })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(booking.start_time)}
          </span>
          {booking.barber && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {booking.barber.split(' ')[0]}
            </span>
          )}
        </div>
        <span className="font-semibold text-foreground">€{booking.service_price.toFixed(0)}</span>
      </div>
    </motion.div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-3 md:p-6 space-y-3 md:space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="min-w-0"
        >
          <h1 className="text-xl md:text-3xl font-bold truncate">Panel de Control</h1>
          <p className="text-muted-foreground text-xs md:text-base truncate">
            {format(new Date(), isMobile ? "d MMM yyyy" : "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2 shrink-0"
        >
          <Button 
            variant="outline" 
            size="icon" 
            className="h-10 w-10 min-h-[44px] min-w-[44px]"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          <Button size="sm" className="h-10 min-h-[44px] px-3" onClick={() => navigate('/calendar')}>
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Nueva Cita</span>
          </Button>
        </motion.div>
      </div>

      {/* Stats Cards - 2x2 on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <AnimatedCard delay={0}>
          <Card className="touch-manipulation h-full">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] md:text-sm font-medium text-muted-foreground">Total Citas</span>
                <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
              </div>
              <div className="text-lg md:text-2xl font-bold">{stats.totalBookings}</div>
              <p className="text-[9px] md:text-xs text-muted-foreground">reservas</p>
            </CardContent>
          </Card>
        </AnimatedCard>

        <AnimatedCard delay={1}>
          <Card className="touch-manipulation h-full border-emerald-500/20">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] md:text-sm font-medium text-muted-foreground">Confirmadas</span>
                <Users className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-500" />
              </div>
              <div className="text-lg md:text-2xl font-bold text-emerald-500">{stats.confirmedBookings}</div>
              <p className="text-[9px] md:text-xs text-emerald-500/70">citas</p>
            </CardContent>
          </Card>
        </AnimatedCard>

        <AnimatedCard delay={2}>
          <Card className="touch-manipulation h-full">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] md:text-sm font-medium text-muted-foreground">Ingresos</span>
                <DollarSign className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
              </div>
              <div className="text-lg md:text-2xl font-bold">€{stats.todayRevenue.toFixed(0)}</div>
              <p className="text-[9px] md:text-xs text-muted-foreground">totales</p>
            </CardContent>
          </Card>
        </AnimatedCard>

        <AnimatedCard delay={3}>
          <Card className="touch-manipulation h-full">
            <CardContent className="p-3 md:p-6">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] md:text-sm font-medium text-muted-foreground">Promedio</span>
                <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
              </div>
              <div className="text-lg md:text-2xl font-bold">€{stats.averagePrice.toFixed(0)}</div>
              <p className="text-[9px] md:text-xs text-muted-foreground">por cita</p>
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>

      {/* Barber Stats - Horizontal scroll on mobile */}
      {barberStatsList.length > 0 && (
        <AnimatedCard delay={4}>
          <Card>
            <CardHeader className="p-3 md:p-6 pb-2 md:pb-4">
              <CardTitle className="text-sm md:text-lg flex items-center gap-2">
                <Scissors className="h-4 w-4 md:h-5 md:w-5" />
                Por Barbero
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              {isMobile ? (
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-dark">
                  {barberStatsList.map((barber, index) => (
                    <motion.div
                      key={barber.name}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex-shrink-0 p-3 rounded-lg border bg-card min-w-[140px]"
                    >
                      <div className="font-semibold text-xs mb-2 truncate">{barber.name}</div>
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-lg font-bold text-primary">{barber.totalBookings}</span>
                        <span className="text-[10px] text-muted-foreground">citas</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-emerald-500">€{barber.totalRevenue.toFixed(0)}</span>
                        <span className="text-[10px] text-muted-foreground">ingresos</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
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
              )}
            </CardContent>
          </Card>
        </AnimatedCard>
      )}

      {/* Bookings List */}
      <AnimatedCard delay={4}>
        <Card>
          <CardHeader className="p-3 md:p-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm md:text-lg">
                Citas
                {filteredAndSortedBookings.length !== bookings.length && (
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    ({filteredAndSortedBookings.length}/{bookings.length})
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {isMobile && (
                  <Button 
                    variant={hasActiveFilters ? "default" : "outline"} 
                    size="icon" 
                    className="h-9 w-9 min-h-[44px] min-w-[44px]"
                    onClick={() => setFiltersOpen(!filtersOpen)}
                  >
                    <Filter className="h-4 w-4" />
                    {hasActiveFilters && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full" />
                    )}
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-9 min-h-[44px] px-2" onClick={() => navigate('/calendar')}>
                  <span className="hidden sm:inline">Ver Agenda</span>
                  <ArrowRight className="h-4 w-4 sm:ml-1" />
                </Button>
              </div>
            </div>
            
            {/* Filter Controls - Collapsible on mobile */}
            {isMobile ? (
              <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                <CollapsibleContent className="space-y-2">
                  {/* Search */}
                  <div className="relative">
                    <Input
                      placeholder="Buscar cliente, servicio..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-11 pr-8"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {/* Status Filter */}
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                      <SelectTrigger className="flex-1 h-11">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border shadow-lg z-50">
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="confirmed">Confirmada</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="completed">Completada</SelectItem>
                        <SelectItem value="cancelled">Cancelada</SelectItem>
                        <SelectItem value="no_show">No asistió</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* Barber Filter */}
                    <Select value={barberFilter} onValueChange={setBarberFilter}>
                      <SelectTrigger className="flex-1 h-11">
                        <SelectValue placeholder="Barbero" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border shadow-lg z-50">
                        <SelectItem value="all">Todos</SelectItem>
                        {uniqueBarbers.map((barber) => (
                          <SelectItem key={barber} value={barber}>{barber}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Clear Filters */}
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={clearFilters} className="w-full h-11">
                      <X className="h-4 w-4 mr-2" />
                      Limpiar filtros
                    </Button>
                  )}
                </CollapsibleContent>
              </Collapsible>
            ) : (
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
            )}
          </CardHeader>
          
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            {filteredAndSortedBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {hasActiveFilters ? 'No hay citas con estos filtros' : 'No hay citas registradas'}
              </div>
            ) : isMobile ? (
              /* Mobile: Card list */
              <div className="space-y-2">
                <AnimatePresence mode="wait">
                  {paginatedBookings.map((booking, index) => (
                    <MobileBookingCard key={booking.id} booking={booking} index={index} />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              /* Desktop: Table */
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
                    <AnimatePresence mode="wait">
                      {paginatedBookings.map((booking, index) => (
                        <motion.tr
                          key={booking.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: Math.min(index * 0.02, 0.2) }}
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
          
          {/* Pagination Controls */}
          {totalItems > 0 && (
            <CardFooter className={cn(
              "flex items-center justify-between gap-2 p-3 md:p-4 border-t",
              isMobile && "flex-col"
            )}>
              {/* Results info */}
              <div className="text-xs md:text-sm text-muted-foreground">
                {startIndex + 1}-{endIndex} de {totalItems}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Page size selector - hidden on mobile */}
                {!isMobile && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Por página:</span>
                    <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
                      <SelectTrigger className="w-[70px] h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border shadow-lg z-50">
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Navigation buttons */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 min-h-[44px] min-w-[44px]"
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 min-h-[44px] min-w-[44px]"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  {/* Page indicator */}
                  <div className="flex items-center gap-1 px-2 min-w-[60px] justify-center">
                    <span className="text-sm font-medium">{currentPage}</span>
                    <span className="text-sm text-muted-foreground">/</span>
                    <span className="text-sm text-muted-foreground">{totalPages || 1}</span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 min-h-[44px] min-w-[44px]"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 min-h-[44px] min-w-[44px]"
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage >= totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardFooter>
          )}
        </Card>
      </AnimatedCard>
    </motion.div>
  );
}
