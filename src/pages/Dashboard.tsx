import { useState, useEffect, useMemo } from 'react';
import { format, subDays, subMonths, addMonths, isSameDay, parseISO } from 'date-fns';
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
import { ApiBooking } from '@/types/api';
import { useBookings, useInvalidateQuery } from '@/hooks/useQueryHooks';
import { useStaffTerms } from '@/hooks/useStaffTerms';
import { cn } from '@/lib/utils';
import { AnimatedCard } from '@/components/ui/animated-card';
import { useIsMobile } from '@/hooks/use-mobile';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { AnimatedCounter } from '@/components/dashboard/AnimatedCounter';

type SortField = 'date' | 'client' | 'service' | 'barber' | 'price';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show';

export default function Dashboard() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const staffTerms = useStaffTerms();
  // Scope to last 3 months + 1 month ahead instead of fetching all-time bookings
  const dashboardDateRange = useMemo(() => {
    const now = new Date();
    return {
      start_date: format(subMonths(now, 3), 'yyyy-MM-dd'),
      end_date: format(addMonths(now, 1), 'yyyy-MM-dd'),
    };
  }, []);
  const { data: bookings = [], isLoading, isError, refetch } = useBookings(dashboardDateRange);
  const { invalidateBookings } = useInvalidateQuery();
  const error = isError ? 'No se pudieron cargar las citas. Por favor, intente de nuevo.' : null;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [barberFilter, setBarberFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  // Get unique barbers for filter dropdown
  // Filter out events from all dashboard calculations
  const actualBookings = useMemo(() => bookings.filter(b => b.booking_type !== 'event'), [bookings]);

  const uniqueBarbers = useMemo(() => {
    const barbers = new Set(actualBookings.map(b => b.barber || 'Sin asignar'));
    return Array.from(barbers).sort();
  }, [actualBookings]);

  // Filter and sort bookings
  const filteredAndSortedBookings = useMemo(() => {
    let result = bookings.filter(b => b.booking_type !== 'event');

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
        case 'date': {
          // Sort by date first, then by time
          const dateA = `${a.booking_date}T${a.start_time}`;
          const dateB = `${b.booking_date}T${b.start_time}`;
          comparison = dateA.localeCompare(dateB);
          break;
        }
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

  // Calculate stats with today vs yesterday comparison
  const today = new Date();
  const yesterday = subDays(today, 1);
  
  const todayBookings = actualBookings.filter(b => isSameDay(parseISO(b.booking_date), today));
  const yesterdayBookings = actualBookings.filter(b => isSameDay(parseISO(b.booking_date), yesterday));
  
  const todayRevenue = todayBookings.reduce((sum, b) => sum + b.service_price, 0);
  const yesterdayRevenue = yesterdayBookings.reduce((sum, b) => sum + b.service_price, 0);
  
  const stats = {
    totalBookings: actualBookings.length,
    confirmedBookings: actualBookings.filter(b => b.status === 'confirmed').length,
    todayRevenue,
    yesterdayRevenue,
    averagePrice: actualBookings.length > 0 
      ? actualBookings.reduce((sum, b) => sum + b.service_price, 0) / actualBookings.length 
      : 0,
  };

  // Calculate stats per barber
  const barberStats = actualBookings.reduce((acc, booking) => {
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.1) }}
      className="p-3 rounded-xl border bg-card active:bg-muted/50 transition-colors touch-manipulation"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{booking.client_name}</div>
          <div className="text-[11px] text-muted-foreground truncate">{booking.client_phone}</div>
        </div>
        <Badge 
          variant="outline" 
          className={cn("text-[10px] px-1.5 py-0.5 shrink-0 whitespace-nowrap", getStatusBadge(booking.status).class)}
        >
          {getStatusBadge(booking.status).label}
        </Badge>
      </div>
      
      <div className="text-[13px] font-medium text-primary mb-1.5 truncate">{booking.service_name}</div>
      
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3 shrink-0" />
            {format(new Date(booking.booking_date), "d MMM", { locale: es })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 shrink-0" />
            {formatTime(booking.start_time)}
          </span>
          {booking.barber && (
            <span className="flex items-center gap-1 truncate max-w-[80px]">
              <User className="h-3 w-3 shrink-0" />
              {booking.barber.split(' ')[0]}
            </span>
          )}
        </div>
        <span className="font-bold text-sm text-foreground">€{booking.service_price.toFixed(0)}</span>
      </div>
    </motion.div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "space-y-4 overflow-x-hidden w-full max-w-full",
        isMobile ? "p-4 pb-6" : "p-6 space-y-6"
      )}
    >
      {/* Header - Optimizado para móvil */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className={cn(
            "font-bold truncate",
            isMobile ? "text-lg" : "text-2xl md:text-3xl"
          )}>Panel de Control</h1>
          <p className={cn(
            "text-muted-foreground truncate",
            isMobile ? "text-[11px]" : "text-sm md:text-base"
          )}>
            {format(new Date(), isMobile ? "EEE, d MMM" : "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button 
            variant="outline" 
            size="icon" 
            className={cn(
              "touch-manipulation",
              isMobile ? "h-10 w-10" : "h-10 w-10"
            )}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          <Button 
            size={isMobile ? "icon" : "sm"} 
            className={cn(
              "touch-manipulation",
              isMobile ? "h-10 w-10" : "h-10 px-3"
            )}
            onClick={() => navigate('/calendar')}
          >
            <Plus className="h-4 w-4" />
            {!isMobile && <span className="ml-2">Nueva Cita</span>}
          </Button>
        </div>
      </div>

      {/* Animated Revenue Counter - Featured Card */}
      <AnimatedCard delay={0}>
        <Card className="touch-manipulation border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
            <div className="flex items-start justify-between">
              <AnimatedCounter 
                value={stats.todayRevenue} 
                previousValue={stats.yesterdayRevenue}
                celebrateAt={[100, 500, 1000, 2000, 5000]}
              />
              <div className="p-2 rounded-full bg-primary/10">
                <DollarSign className={cn("text-primary", isMobile ? "h-5 w-5" : "h-6 w-6")} />
              </div>
            </div>
          </CardContent>
        </Card>
      </AnimatedCard>

      {/* Stats Cards - Grid optimizado 2x2 en móvil */}
      <div className={cn(
        "grid gap-3",
        isMobile ? "grid-cols-3" : "grid-cols-3 lg:grid-cols-3 gap-4"
      )}>
        {[
          { label: 'Total Citas', value: stats.totalBookings, sub: 'reservas', icon: Calendar, color: '' },
          { label: 'Confirmadas', value: stats.confirmedBookings, sub: 'citas', icon: Users, color: 'text-emerald-500', borderColor: 'border-emerald-500/20' },
          { label: 'Promedio', value: `€${stats.averagePrice.toFixed(0)}`, sub: 'por cita', icon: TrendingUp, color: '' },
        ].map((stat, idx) => (
          <AnimatedCard key={stat.label} delay={idx + 1}>
            <Card className={cn("touch-manipulation h-full", stat.borderColor)}>
              <CardContent className={cn(isMobile ? "p-3" : "p-4 md:p-6")}>
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "font-medium text-muted-foreground truncate",
                    isMobile ? "text-[10px]" : "text-xs md:text-sm"
                  )}>{stat.label}</span>
                  <stat.icon className={cn(
                    "shrink-0",
                    isMobile ? "h-3.5 w-3.5" : "h-4 w-4",
                    stat.color || "text-muted-foreground"
                  )} />
                </div>
                <div className={cn(
                  "font-bold truncate",
                  isMobile ? "text-xl" : "text-2xl md:text-3xl",
                  stat.color
                )}>{stat.value}</div>
                <p className={cn(
                  "text-muted-foreground",
                  isMobile ? "text-[9px]" : "text-xs",
                  stat.color && stat.color.replace('text-', 'text-') + '/70'
                )}>{stat.sub}</p>
              </CardContent>
            </Card>
          </AnimatedCard>
        ))}
      </div>

      {/* Barber Stats - Scroll horizontal optimizado en móvil */}
      {barberStatsList.length > 0 && (
        <AnimatedCard delay={4}>
          <Card>
            <CardHeader className={cn(isMobile ? "px-4 py-3 pb-2" : "p-6 pb-4")}>
              <CardTitle className={cn(
                "flex items-center gap-2",
                isMobile ? "text-sm" : "text-lg"
              )}>
                <Scissors className={cn(isMobile ? "h-4 w-4" : "h-5 w-5")} />
                Por {staffTerms.singularCap}
              </CardTitle>
            </CardHeader>
            <CardContent className={cn(isMobile ? "px-4 pb-3 pt-0" : "p-6 pt-0")}>
              {isMobile ? (
                <div className="grid grid-cols-2 gap-2">
                  {barberStatsList.map((barber, index) => (
                    <motion.div
                      key={barber.name}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-3 rounded-xl border bg-card/50"
                    >
                      <div className="font-semibold text-[11px] mb-1.5 truncate">{barber.name}</div>
                      <div className="space-y-0.5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-bold text-primary">{barber.totalBookings}</span>
                          <span className="text-[9px] text-muted-foreground">citas</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-emerald-500">€{barber.totalRevenue.toFixed(0)}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {barberStatsList.map((barber, index) => (
                    <motion.div
                      key={barber.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="font-semibold text-base mb-3">{barber.name}</div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-xl font-bold text-primary">{barber.totalBookings}</div>
                          <div className="text-xs text-muted-foreground">Citas</div>
                        </div>
                        <div>
                          <div className="text-xl font-bold text-emerald-500">€{barber.totalRevenue.toFixed(0)}</div>
                          <div className="text-xs text-muted-foreground">Ingresos</div>
                        </div>
                        <div>
                          <div className="text-xl font-bold">€{barber.averagePrice.toFixed(0)}</div>
                          <div className="text-xs text-muted-foreground">Promedio</div>
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

      {/* Bookings List - Optimizado para móvil */}
      <AnimatedCard delay={4}>
        <Card>
          <CardHeader className={cn(isMobile ? "px-4 py-3 space-y-2" : "p-6 space-y-3")}>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className={cn(isMobile ? "text-sm" : "text-lg")}>
                Citas
                {filteredAndSortedBookings.length !== bookings.length && (
                  <span className="text-[10px] md:text-xs font-normal text-muted-foreground ml-1">
                    ({filteredAndSortedBookings.length}/{bookings.length})
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-1.5">
                {isMobile && (
                  <Button 
                    variant={hasActiveFilters ? "default" : "outline"} 
                    size="icon" 
                    className="h-10 w-10 relative touch-manipulation"
                    onClick={() => setFiltersOpen(!filtersOpen)}
                  >
                    <Filter className="h-4 w-4" />
                    {hasActiveFilters && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full" />
                    )}
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size={isMobile ? "icon" : "sm"} 
                  className={cn("touch-manipulation", isMobile ? "h-10 w-10" : "h-9 px-2")}
                  onClick={() => navigate('/calendar')}
                >
                  {!isMobile && <span>Ver Agenda</span>}
                  <ArrowRight className={cn("h-4 w-4", !isMobile && "ml-1")} />
                </Button>
              </div>
            </div>
            
            {/* Filter Controls - Collapsible on mobile */}
            {isMobile ? (
              <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                <CollapsibleContent className="space-y-2 pt-1">
                  {/* Search */}
                  <div className="relative">
                    <Input
                      placeholder="Buscar cliente, servicio..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-10 pr-8 text-sm"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground active:text-foreground p-1 touch-manipulation"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {/* Status Filter */}
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                      <SelectTrigger className="flex-1 h-10 text-sm">
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
                      <SelectTrigger className="flex-1 h-10 text-sm">
                        <SelectValue placeholder={staffTerms.singularCap} />
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
                    <Button variant="outline" size="sm" onClick={clearFilters} className="w-full h-10 text-sm">
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
                    <SelectValue placeholder={staffTerms.singularCap} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-lg z-50">
                    <SelectItem value="all">Todos los {staffTerms.plural}</SelectItem>
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
          
          <CardContent className={cn(isMobile ? "px-4 pb-3 pt-0" : "p-6 pt-0")}>
            {filteredAndSortedBookings.length === 0 ? (
              <div className={cn(
                "text-center text-muted-foreground",
                isMobile ? "py-6 text-sm" : "py-8"
              )}>
                {hasActiveFilters ? 'No hay citas con estos filtros' : 'No hay citas registradas'}
              </div>
            ) : isMobile ? (
              /* Mobile: Card list optimizado */
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
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
                          {staffTerms.singularCap}
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
          
          {/* Pagination Controls - Compacto en móvil */}
          {totalItems > 0 && (
            <CardFooter className={cn(
              "flex items-center border-t",
              isMobile 
                ? "justify-between gap-2 px-4 py-3" 
                : "justify-between gap-2 p-4"
            )}>
              {/* Results info */}
              <div className={cn(
                "text-muted-foreground",
                isMobile ? "text-[11px]" : "text-sm"
              )}>
                {startIndex + 1}-{endIndex} de {totalItems}
              </div>
              
              <div className="flex items-center gap-1.5">
                {/* Page size selector - hidden on mobile */}
                {!isMobile && (
                  <div className="flex items-center gap-2 mr-2">
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
                
                {/* Navigation buttons - Compactos en móvil */}
                <div className="flex items-center gap-1">
                  {!isMobile && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => goToPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn("touch-manipulation", isMobile ? "h-10 w-10" : "h-9 w-9")}
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  {/* Page indicator */}
                  <div className={cn(
                    "flex items-center justify-center gap-0.5",
                    isMobile ? "min-w-[50px] text-xs" : "min-w-[60px] text-sm px-2"
                  )}>
                    <span className="font-medium">{currentPage}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-muted-foreground">{totalPages || 1}</span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn("touch-manipulation", isMobile ? "h-10 w-10" : "h-9 w-9")}
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  {!isMobile && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => goToPage(totalPages)}
                      disabled={currentPage >= totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardFooter>
          )}
        </Card>
      </AnimatedCard>
    </motion.div>
  );
}
