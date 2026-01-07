import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Scissors,
  Edit,
  Trash2,
  Plus,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Client, Booking } from '@/types';
import { clientsApi, bookingsApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import ClientModal from '@/components/clients/ClientModal';

const statusConfig = {
  pending: { label: 'Pending', class: 'status-badge-pending' },
  confirmed: { label: 'Confirmed', class: 'status-badge-success' },
  completed: { label: 'Completed', class: 'status-badge-success' },
  cancelled: { label: 'Cancelled', class: 'status-badge-cancelled' },
  'no-show': { label: 'No-show', class: 'status-badge-cancelled' },
};

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadClientData();
    }
  }, [id]);

  const loadClientData = async () => {
    setIsLoading(true);
    try {
      const [clientData, allBookings] = await Promise.all([
        clientsApi.getById(id!),
        bookingsApi.getAll(),
      ]);
      setClient(clientData);
      setBookings(allBookings.filter((b) => b.clientId === id).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
    } catch (error) {
      toast({ title: 'Error loading client', variant: 'destructive' });
      navigate('/clients');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveClient = async (clientData: Partial<Client>) => {
    const updated = await clientsApi.update(id!, clientData);
    setClient(updated);
    toast({ title: 'Client updated successfully' });
  };

  const handleDeleteClient = async () => {
    await clientsApi.delete(id!);
    toast({ title: 'Client deleted' });
    navigate('/clients');
  };

  // Calculate favorite services
  const favoriteServices = bookings
    .filter((b) => b.status === 'completed')
    .reduce((acc, b) => {
      acc[b.serviceName] = (acc[b.serviceName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const sortedServices = Object.entries(favoriteServices)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 md:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clients')} className="h-10 w-10 min-h-[44px] min-w-[44px]">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold truncate">{client.name}</h1>
          <p className="text-muted-foreground text-sm">Client Profile</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)} className="h-10 min-h-[44px]">
          <Edit className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Edit</span>
        </Button>
        <Button variant="destructive" size="icon" onClick={handleDeleteClient} className="h-10 w-10 min-h-[44px] min-w-[44px]">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left Column - Client Info */}
        <div className="space-y-6">
          {/* Contact Card */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">
                    {client.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{client.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{client.email || 'No email'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Customer since {format(new Date(client.createdAt), 'MMM yyyy')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Scissors className="h-4 w-4" />
                  <span>Total Visits</span>
                </div>
                <span className="font-bold">{client.totalVisits}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Total Spent</span>
                </div>
                <span className="font-bold">€{client.totalSpent}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Last Visit</span>
                </div>
                <span className="font-bold">
                  {client.lastVisit ? format(new Date(client.lastVisit), 'MMM d') : 'Never'}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Avg. per Visit</span>
                </div>
                <span className="font-bold">
                  €{client.totalVisits > 0 ? Math.round(client.totalSpent / client.totalVisits) : 0}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Favorite Services */}
          {sortedServices.length > 0 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Favorite Services</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sortedServices.map(([service, count]) => (
                    <div key={service} className="flex items-center justify-between">
                      <span>{service}</span>
                      <Badge variant="secondary">{count}x</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {client.notes && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{client.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {client.tags && client.tags.length > 0 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {client.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Appointment History */}
        <div className="lg:col-span-2">
          <Card className="border-border h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Appointment History</CardTitle>
              <Button size="sm" onClick={() => navigate('/calendar')}>
                <Plus className="h-4 w-4 mr-2" />
                Book Appointment
              </Button>
            </CardHeader>
            <CardContent>
              {bookings.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No appointments yet</p>
                  <Button variant="outline" className="mt-4" onClick={() => navigate('/calendar')}>
                    Book First Appointment
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => {
                    const status = statusConfig[booking.status];
                    return (
                      <div
                        key={booking.id}
                        className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-lg bg-card flex flex-col items-center justify-center border border-border">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(booking.date), 'MMM')}
                          </span>
                          <span className="font-bold">
                            {format(new Date(booking.date), 'd')}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{booking.serviceName}</span>
                            <Badge className={cn('text-xs', status.class)}>
                              {status.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {booking.time}
                            </span>
                            <span>{booking.serviceDuration} min</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">€{booking.servicePrice}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Client Modal */}
      <ClientModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        client={client}
        onSave={handleSaveClient}
      />
    </div>
  );
}
