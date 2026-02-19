import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  MoreHorizontal,
  Phone,
  Mail,
  Calendar,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Client } from '@/types';
import { supabaseClientsApi } from '@/services/supabaseClients';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import ClientModal from '@/components/clients/ClientModal';
import { AnimatedCard, AnimatedList, AnimatedListItem } from '@/components/ui/animated-card';

type SortField = 'name' | 'totalVisits' | 'totalSpent' | 'lastVisit';
type SortOrder = 'asc' | 'desc';

const ITEMS_PER_PAGE = 10;

export default function Clients() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('lastVisit');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const data = await supabaseClientsApi.getAll();
      setClients(data);
      console.log('✅ Clients loaded:', data);
    } catch (error) {
      console.error('❌ Error loading clients:', error);
      toast({ 
        title: 'Error al cargar clientes', 
        description: 'Por favor, inténtalo de nuevo',
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    return {
      totalClients: clients.length,
      activeThisMonth: clients.filter(c => {
        if (!c.lastVisit) return false;
        const lastVisit = new Date(c.lastVisit);
        return lastVisit >= monthAgo;
      }).length,
      totalRevenue: clients.reduce((sum, c) => sum + Number(c.totalSpent), 0),
      averageSpent: clients.length > 0 
        ? Math.round(clients.reduce((sum, c) => sum + Number(c.totalSpent), 0) / clients.length)
        : 0
    };
  }, [clients]);

  const filteredAndSortedClients = useMemo(() => {
    let result = [...clients];

    // Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.phone.includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'totalVisits':
          comparison = a.totalVisits - b.totalVisits;
          break;
        case 'totalSpent':
          comparison = Number(a.totalSpent) - Number(b.totalSpent);
          break;
        case 'lastVisit': {
          const dateA = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
          const dateB = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
          comparison = dateA - dateB;
          break;
        }
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [clients, searchQuery, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedClients.length / ITEMS_PER_PAGE);
  const paginatedClients = filteredAndSortedClients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSaveClient = async (clientData: Partial<Client>) => {
    try {
      if (editingClient) {
        const updated = await supabaseClientsApi.update(editingClient.id, clientData);
        setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        toast({ title: 'Cliente actualizado correctamente' });
      } else {
        const created = await supabaseClientsApi.create(clientData as Omit<Client, 'id' | 'createdAt' | 'totalVisits' | 'totalSpent' | 'lastVisit'>);
        setClients((prev) => [created, ...prev]);
        toast({ title: 'Cliente creado correctamente' });
      }
      setEditingClient(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving client:', error);
      toast({ 
        title: 'Error al guardar cliente', 
        variant: 'destructive' 
      });
      throw error;
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      await supabaseClientsApi.delete(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
      toast({ title: 'Cliente eliminado' });
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({ 
        title: 'Error al eliminar cliente', 
        variant: 'destructive' 
      });
    }
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:text-foreground transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown
          className={cn(
            'h-4 w-4',
            sortField === field ? 'text-primary' : 'text-muted-foreground'
          )}
        />
      </div>
    </TableHead>
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-11 w-36" />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-border">
              <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-xl md:text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground text-sm">Gestiona tu base de datos de clientes</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <Button 
            variant="outline" 
            size="icon"
            onClick={loadClients}
            className="h-11 w-11 min-h-[44px] min-w-[44px]"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => { setEditingClient(null); setIsModalOpen(true); }} className="h-11 min-h-[44px]">
            <Plus className="h-4 w-4 mr-2" />
            Añadir Cliente
          </Button>
        </motion.div>
      </div>

      {/* Stats Cards - 2x2 on mobile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <AnimatedCard delay={0}>
          <Card className="border-border h-full">
            <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Total Clientes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <p className="text-xl md:text-2xl font-bold">{stats.totalClients}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard delay={1}>
          <Card className="border-border h-full">
            <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Activos Este Mes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <p className="text-xl md:text-2xl font-bold">{stats.activeThisMonth}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard delay={2}>
          <Card className="border-border h-full">
            <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Ingresos Totales
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <p className="text-xl md:text-2xl font-bold">
                €{stats.totalRevenue.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard delay={3}>
          <Card className="border-border h-full">
            <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Prom. por Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <p className="text-xl md:text-2xl font-bold">€{stats.averageSpent}</p>
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>

      {/* Search & Client List */}
      <AnimatedCard delay={4}>
        <Card className="border-border">
          <CardHeader className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, teléfono, email o etiqueta..."
                  className="pl-9 h-11 min-h-[44px]"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {filteredAndSortedClients.length} clientes
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            {/* Empty state */}
            {clients.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-2">No hay clientes todavía</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Los nuevos clientes aparecerán aquí cuando reserven.
                </p>
                <Button onClick={() => { setEditingClient(null); setIsModalOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir primer cliente
                </Button>
              </div>
            )}

            {/* Mobile: Card list */}
            {clients.length > 0 && (
              <>
                <AnimatedList className="md:hidden space-y-3">
                  {paginatedClients.map((client) => (
                    <AnimatedListItem key={client.id}>
                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors touch-manipulation active:bg-muted min-h-[72px]"
                        onClick={() => navigate(`/clients/${client.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 min-w-[48px] rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                            {client.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{client.name}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3 shrink-0" />
                              <span className="truncate">{client.phone || 'Sin teléfono'}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold">€{Number(client.totalSpent).toFixed(0)}</p>
                            <Badge variant="secondary" className="text-xs">{client.totalVisits} visitas</Badge>
                          </div>
                        </div>
                        {client.tags && client.tags.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {client.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    </AnimatedListItem>
                  ))}
                </AnimatedList>

                {/* Desktop: Table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortHeader field="name">Nombre</SortHeader>
                        <TableHead>Contacto</TableHead>
                        <SortHeader field="totalVisits">Visitas</SortHeader>
                        <SortHeader field="totalSpent">Total Gastado</SortHeader>
                        <SortHeader field="lastVisit">Última Visita</SortHeader>
                        <TableHead>Etiquetas</TableHead>
                        <TableHead className="w-[50px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedClients.map((client) => (
                        <TableRow
                          key={client.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/clients/${client.id}`)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                                {client.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                              <span className="font-medium">{client.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <a 
                                href={`tel:${client.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                              >
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                {client.phone || 'Sin teléfono'}
                              </a>
                              {client.email && (
                                <a 
                                  href={`mailto:${client.email}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                                >
                                  <Mail className="h-3 w-3" />
                                  {client.email}
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{client.totalVisits}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">€{Number(client.totalSpent).toFixed(2)}</TableCell>
                          <TableCell>
                            {client.lastVisit ? (
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {format(new Date(client.lastVisit), 'd MMM yyyy', { locale: es })}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Nunca</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {client.tags?.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {client.tags && client.tags.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{client.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-10 w-10 min-h-[44px] min-w-[44px]">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="min-h-[44px]" onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/clients/${client.id}`);
                                }}>
                                  Ver Detalles
                                </DropdownMenuItem>
                                <DropdownMenuItem className="min-h-[44px]" onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingClient(client);
                                  setIsModalOpen(true);
                                }}>
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive min-h-[44px]"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClient(client.id);
                                  }}
                                >
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground order-2 sm:order-1">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedClients.length)} de {filteredAndSortedClients.length}
                </p>
                <div className="flex items-center gap-2 order-1 sm:order-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-10 min-h-[44px] min-w-[44px]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-10 min-h-[44px] min-w-[44px]"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </AnimatedCard>

      {/* Client Modal */}
      <ClientModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        client={editingClient}
        onSave={handleSaveClient}
      />
    </motion.div>
  );
}
