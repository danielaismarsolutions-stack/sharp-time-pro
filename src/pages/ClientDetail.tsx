import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  ChevronRight,
  DollarSign,
  Scissors,
  Edit,
  Trash2,
  Plus,
  Clock,
  Loader2,
  Tag,
  X,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Client, Booking, BookingStatus, BookingSource } from '@/types';
import { ApiBooking, ApiBookingStatus, ApiPaymentMethod } from '@/types/api';
import { supabaseClientsApi, ClientWithBookings } from '@/services/supabaseClients';
import { supabaseBookingsApi } from '@/services/supabaseBookings';
import { notifyBookingUsers } from '@/services/supabaseNotifications';
import { getBusinessId } from '@/config/session';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import {
  useClientDetail,
  useClients,
  useServices,
  useBarbers,
  useInvalidateQuery,
} from '@/hooks/useQueryHooks';
import { cn } from '@/lib/utils';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import ClientModal from '@/components/clients/ClientModal';
import BookingModal from '@/components/bookings/BookingModal';
import { BookingDetailModal } from '@/components/calendar';
import type { BookingStatus as StatusBadgeStatus } from '@/components/calendar/StatusBadge';

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, dateLocale } = useTranslation();
  const { user } = useAuth();

  const statusConfig: Record<string, { label: string; class: string }> = {
    pending: { label: t('clients.status.pending'), class: 'bg-yellow-500/20 text-yellow-500' },
    confirmed: { label: t('clients.status.confirmed'), class: 'bg-violet-500/20 text-violet-500' },
    completed: { label: t('clients.status.completed'), class: 'bg-green-500/20 text-green-500' },
    cancelled: { label: t('clients.status.cancelled'), class: 'bg-red-500/20 text-red-500' },
    'no-show': { label: t('clients.status.noShow'), class: 'bg-gray-500/20 text-gray-500' },
    'no_show': { label: t('clients.status.noShow'), class: 'bg-gray-500/20 text-gray-500' },
  };

  const bookingStatusLabels: Record<ApiBookingStatus, string> = {
    pending: t('clients.statusLower.pending'),
    confirmed: t('clients.statusLower.confirmed'),
    completed: t('clients.statusLower.completed'),
    cancelled: t('clients.statusLower.cancelled'),
    no_show: t('clients.statusLower.noShow'),
  };
  const { confirm, dialogProps: confirmDialogProps } = useConfirmAction();
  const { data: clientData, isLoading, refetch: loadClientData } = useClientDetail(id);
  const { invalidateClients, invalidateBookings } = useInvalidateQuery();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Booking data needed by the booking modals (cached, shared with Calendar)
  const { data: allClients = [], isLoading: isLoadingClients } = useClients();
  const { data: services = [], isLoading: isLoadingServices } = useServices();
  const { data: barbers = [], isLoading: isLoadingBarbers } = useBarbers(false);
  const isBookingDataReady = !isLoadingClients && !isLoadingServices && !isLoadingBarbers;

  // Booking detail / create / edit state
  const [selectedApiBooking, setSelectedApiBooking] = useState<ApiBooking | null>(null);
  const [isBookingDetailOpen, setIsBookingDetailOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<ApiBooking | null>(null);
  const [openingBookingId, setOpeningBookingId] = useState<string | null>(null);

  // Most recent booking that wasn't cancelled — used to preselect the
  // client's last service and barber when creating a new appointment.
  // clientData.bookings is already ordered by date desc, time desc.
  const lastRelevantBooking = useMemo(() => {
    if (!clientData) return null;
    return (
      clientData.bookings.find((b) => String(b.status) !== 'cancelled') ||
      clientData.bookings[0] ||
      null
    );
  }, [clientData]);

  const preselectedServiceId = useMemo(() => {
    if (!lastRelevantBooking) return undefined;
    const byId = services.find(
      (s) => s.isActive && lastRelevantBooking.serviceId && s.id === lastRelevantBooking.serviceId
    );
    if (byId) return byId.id;
    // Fallback for legacy bookings without a stored service_id
    return services.find((s) => s.isActive && s.name === lastRelevantBooking.serviceName)?.id;
  }, [lastRelevantBooking, services]);

  const preselectedBarberId = useMemo(() => {
    if (!lastRelevantBooking) return undefined;
    const byId = barbers.find(
      (b) => lastRelevantBooking.barberId && b.id === lastRelevantBooking.barberId
    );
    if (byId) return byId.id;
    // Fallback: match by the stored barber display name
    return barbers.find((b) => lastRelevantBooking.barber && b.name === lastRelevantBooking.barber)?.id;
  }, [lastRelevantBooking, barbers]);

  // Open the detail modal for a booking from the history list. The history
  // rows carry a reduced shape, so fetch the full booking first.
  const handleBookingClick = async (bookingId: string) => {
    if (openingBookingId) return;
    setOpeningBookingId(bookingId);
    try {
      const fullBooking = await supabaseBookingsApi.getById(bookingId);
      if (!fullBooking || fullBooking.booking_type === 'event') {
        toast({
          title: t('clients.booking.unavailableTitle'),
          description: t('clients.booking.unavailableDescription'),
          variant: 'destructive',
        });
        invalidateClients();
        return;
      }
      setSelectedApiBooking(fullBooking);
      setIsBookingDetailOpen(true);
    } catch {
      toast({ title: t('clients.booking.loadError'), variant: 'destructive' });
    } finally {
      setOpeningBookingId(null);
    }
  };

  const closeBookingDetail = () => {
    setIsBookingDetailOpen(false);
    // Delay clearing so the dialog close animation keeps its content
    setTimeout(() => setSelectedApiBooking(null), 250);
  };

  const handleBookingStatusChange = async (
    bookingId: string,
    status: StatusBadgeStatus | ApiBookingStatus
  ) => {
    const apiStatus: ApiBookingStatus = (
      status === 'no-show' ? 'no_show' : status
    ) as ApiBookingStatus;

    const confirmed = await confirm({
      title: t('clients.booking.changeStatusTitle'),
      description: t('clients.booking.changeStatusDescription', { status: bookingStatusLabels[apiStatus] }),
      confirmLabel: t('common.confirm'),
      variant: apiStatus === 'cancelled' ? 'destructive' : 'default',
    });
    if (!confirmed) return;

    try {
      const updated = await supabaseBookingsApi.updateStatus(bookingId, apiStatus);
      setSelectedApiBooking((prev) => (prev && prev.id === bookingId ? updated : prev));

      try {
        await notifyBookingUsers({
          business_id: getBusinessId(),
          type: 'booking_status_changed',
          title: t('clients.notifications.statusChangedTitle'),
          message: t('clients.notifications.statusChangedMessage', {
            user: user?.name || t('clients.userFallback'),
            client: updated.client_name || t('clients.clientFallback'),
            status: bookingStatusLabels[apiStatus],
          }),
          barber_user_id: updated.user_id,
          performed_by_user_id: user?.id || '',
          metadata: {
            booking_id: bookingId,
            client_name: updated.client_name,
            new_status: apiStatus,
            changed_by: user?.name,
          },
        });
      } catch { /* ignored */ }

      invalidateClients();
      invalidateBookings();
      toast({ title: t('clients.booking.markedAs', { status: bookingStatusLabels[apiStatus] }) });
    } catch {
      toast({ title: t('clients.booking.updateError'), variant: 'destructive' });
    }
  };

  const handleBookingPaymentChange = async (
    bookingId: string,
    method: ApiPaymentMethod | null
  ) => {
    try {
      const updated = method
        ? await supabaseBookingsApi.updatePayment(bookingId, method)
        : await supabaseBookingsApi.clearPayment(bookingId);
      setSelectedApiBooking((prev) => (prev && prev.id === bookingId ? updated : prev));
      invalidateBookings();
      const methodLabels: Record<string, string> = {
        cash: t('clients.payment.cash'),
        card: t('clients.payment.card'),
        bizum: t('clients.payment.bizum'),
      };
      toast({
        title: method
          ? t('clients.payment.recorded', { method: methodLabels[method] })
          : t('clients.payment.cleared'),
      });
    } catch {
      toast({ title: t('clients.payment.updateError'), variant: 'destructive' });
    }
  };

  const handleBookingDelete = async (bookingId: string) => {
    const confirmed = await confirm({
      title: t('clients.booking.deleteTitle'),
      description: t('clients.booking.deleteDescription'),
      confirmLabel: t('common.delete'),
      variant: 'destructive',
    });
    if (!confirmed) return;

    const deletedBooking = selectedApiBooking;
    try {
      await supabaseBookingsApi.delete(bookingId);
      closeBookingDetail();

      if (deletedBooking) {
        try {
          await notifyBookingUsers({
            business_id: getBusinessId(),
            type: 'booking_deleted',
            title: t('clients.notifications.bookingDeletedTitle'),
            message: t('clients.notifications.bookingDeletedMessage', {
              user: user?.name || t('clients.userFallback'),
              client: deletedBooking.client_name,
              service: deletedBooking.service_name,
            }),
            barber_user_id: deletedBooking.user_id,
            performed_by_user_id: user?.id || '',
            metadata: {
              booking_id: bookingId,
              client_name: deletedBooking.client_name,
              service_name: deletedBooking.service_name,
              deleted_by: user?.name,
            },
          });
        } catch { /* ignored */ }
      }

      invalidateClients();
      invalidateBookings();
      toast({ title: t('clients.booking.deletedToast') });
    } catch {
      toast({ title: t('clients.booking.deleteError'), variant: 'destructive' });
    }
  };

  const handleBookingEdit = (booking: ApiBooking) => {
    setEditingBooking(booking);
    setIsBookingDetailOpen(false);
    setSelectedApiBooking(null);
    setIsBookingModalOpen(true);
  };

  const openNewBooking = () => {
    setEditingBooking(null);
    setIsBookingModalOpen(true);
  };

  // Create/update an appointment from the booking modal. Errors propagate so
  // the modal shows its own error toast and stays open.
  const handleSaveBooking = async (data: Partial<Booking>) => {
    const selectedService = services.find((s) => s.id === data.serviceId);
    const duration = selectedService?.duration || data.serviceDuration || 30;

    const [hours, minutes] = (data.time || '09:00').split(':').map(Number);
    const endHours = hours + Math.floor((minutes + duration) / 60);
    const endMinutes = (minutes + duration) % 60;
    const computedEndTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`;
    // When editing, honor a user-customized end time if provided.
    const endTime = data.endTime ? `${data.endTime}:00` : computedEndTime;

    if (editingBooking) {
      await supabaseBookingsApi.update(editingBooking.id, {
        booking_date: data.date,
        start_time: `${data.time}:00`,
        end_time: endTime,
        status: (data.status?.replace('-', '_') || 'confirmed') as ApiBookingStatus,
        notes: data.notes || null,
        user_id: data.barberId || null,
        barber: data.barber || null,
        client_id: data.clientId || editingBooking.client_id,
        client_name: data.clientName || editingBooking.client_name,
        client_phone: data.clientPhone || editingBooking.client_phone,
        client_email: data.clientEmail || null,
        service_id: data.serviceId || editingBooking.service_id,
        service_name: data.serviceName || editingBooking.service_name,
        service_duration: duration,
        service_price: data.servicePrice || editingBooking.service_price,
      });

      try {
        await notifyBookingUsers({
          business_id: getBusinessId(),
          type: 'booking_modified',
          title: t('clients.notifications.bookingModifiedTitle'),
          message: t('clients.notifications.bookingModifiedMessage', {
            user: user?.name || t('clients.userFallback'),
            client: data.clientName || '',
            service: data.serviceName || '',
            date: format(new Date(data.date || ''), 'dd/MM/yyyy', { locale: dateLocale }),
            time: data.time || '',
          }),
          barber_user_id: data.barberId || editingBooking.user_id,
          performed_by_user_id: user?.id || '',
          metadata: {
            booking_id: editingBooking.id,
            client_name: data.clientName,
            service_name: data.serviceName,
            booking_date: data.date,
            start_time: data.time,
            modified_by: user?.name,
          },
        });
      } catch { /* ignored */ }
    } else {
      const newBooking = await supabaseBookingsApi.create({
        // null (not '') when the appointment has no client: the client_id
        // column is a nullable uuid and '' is not a valid uuid.
        client_id: data.clientId || null,
        service_id: data.serviceId || '',
        user_id: data.barberId || null,
        booking_date: data.date || '',
        start_time: `${data.time}:00`,
        end_time: endTime,
        status: 'confirmed',
        source: ((data.source || 'phone').replace('-', '_')) as 'online' | 'phone' | 'walk_in',
        client_name: data.clientName || '',
        client_phone: data.clientPhone || '',
        client_email: data.clientEmail || null,
        service_name: data.serviceName || '',
        service_duration: duration,
        service_price: data.servicePrice || 0,
        notes: data.notes || null,
        barber: data.barber || null,
      });

      try {
        await notifyBookingUsers({
          business_id: getBusinessId(),
          type: 'booking_created',
          title: t('clients.notifications.bookingCreatedTitle', { barber: data.barber || t('clients.unassigned') }),
          message: t('clients.notifications.bookingCreatedMessage', {
            user: user?.name || t('clients.userFallback'),
            client: data.clientName || '',
            service: data.serviceName || '',
            barber: data.barber || t('clients.unassigned'),
            date: format(new Date(data.date || ''), 'dd/MM/yyyy', { locale: dateLocale }),
            time: data.time || '',
          }),
          barber_user_id: data.barberId || newBooking.user_id,
          performed_by_user_id: user?.id || '',
          metadata: {
            booking_id: newBooking.id,
            client_name: data.clientName,
            service_name: data.serviceName,
            booking_date: data.date,
            start_time: data.time,
            created_by: user?.name,
          },
        });
      } catch { /* ignored */ }
    }

    setEditingBooking(null);
    invalidateClients();
    invalidateBookings();
  };

  const handleSaveClient = async (updates: Partial<Client>) => {
    const confirmed = await confirm({
      title: t('clients.confirm.updateTitle'),
      description: t('clients.confirm.updateDescription', { name: updates.name || clientData?.name || '' }),
      confirmLabel: t('common.update'),
    });
    if (!confirmed) return;

    try {
      await supabaseClientsApi.update(id!, updates);
      invalidateClients();
      toast({ title: t('clients.toasts.updated') });
    } catch (error) {
      toast({ title: t('clients.toasts.updateError'), variant: 'destructive' });
      throw error;
    }
  };

  const handleDeleteClient = async () => {
    const confirmed = await confirm({
      title: t('clients.confirm.deleteTitle'),
      description: t('clients.confirm.deleteDescription', { name: clientData?.name || '' }),
      confirmLabel: t('common.delete'),
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      await supabaseClientsApi.delete(id!);
      invalidateClients();
      toast({ title: t('clients.toasts.deleted') });
      navigate('/clients');
    } catch (error) {
      toast({ title: t('clients.toasts.deleteError'), variant: 'destructive' });
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim() || !clientData) return;

    const updatedTags = [...(clientData.tags || []), newTag.trim()];

    try {
      await supabaseClientsApi.updateTags(id!, updatedTags);
      invalidateClients();
      setNewTag('');
      setIsAddingTag(false);
      toast({ title: t('clients.toasts.tagAdded') });
    } catch (error) {
      toast({ title: t('clients.toasts.tagAddError'), variant: 'destructive' });
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!clientData) return;

    const confirmed = await confirm({
      title: t('clients.confirm.deleteTagTitle'),
      description: t('clients.confirm.deleteTagDescription', { tag: tagToRemove }),
      confirmLabel: t('common.delete'),
      variant: 'destructive',
    });
    if (!confirmed) return;

    const updatedTags = (clientData.tags || []).filter(t => t !== tagToRemove);

    try {
      await supabaseClientsApi.updateTags(id!, updatedTags);
      invalidateClients();
      toast({ title: t('clients.toasts.tagRemoved') });
    } catch (error) {
      toast({ title: t('clients.toasts.tagRemoveError'), variant: 'destructive' });
    }
  };

  // Calculate favorite services from bookings
  const favoriteServices = clientData?.bookings
    .filter((b) => b.status === 'completed')
    .reduce((acc, b) => {
      acc[b.serviceName] = (acc[b.serviceName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

  const sortedServices = Object.entries(favoriteServices)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10" />
          <div className="flex-1">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!clientData) {
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
          <h1 className="text-xl md:text-2xl font-bold truncate">{clientData.name}</h1>
          <p className="text-muted-foreground text-sm">{t('clients.detail.profileSubtitle')}</p>
        </div>
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => loadClientData()}
          className="h-10 w-10 min-h-[44px] min-w-[44px]"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)} className="h-10 min-h-[44px]">
          <Edit className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">{t('common.edit')}</span>
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
              <CardTitle className="text-base">{t('clients.detail.contactInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">
                    {clientData.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <a 
                  href={`tel:${clientData.phone}`}
                  className="flex items-center gap-3 hover:text-primary transition-colors"
                >
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{clientData.phone || t('clients.noPhone')}</span>
                </a>
                <a 
                  href={clientData.email ? `mailto:${clientData.email}` : undefined}
                  className={cn(
                    "flex items-center gap-3",
                    clientData.email && "hover:text-primary transition-colors"
                  )}
                >
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{clientData.email || t('clients.noEmail')}</span>
                </a>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{t('clients.detail.clientSince', { date: format(new Date(clientData.createdAt), 'MMM yyyy', { locale: dateLocale }) })}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">{t('clients.detail.statistics')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Scissors className="h-4 w-4" />
                  <span>{t('clients.detail.totalVisits')}</span>
                </div>
                <span className="font-bold">{clientData.totalVisits}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>{t('clients.detail.totalSpent')}</span>
                </div>
                <span className="font-bold">€{Number(clientData.totalSpent).toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{t('clients.detail.lastVisit')}</span>
                </div>
                <span className="font-bold">
                  {clientData.lastVisit
                    ? format(new Date(clientData.lastVisit), 'd MMM', { locale: dateLocale })
                    : t('clients.never')}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>{t('clients.detail.avgPerVisit')}</span>
                </div>
                <span className="font-bold">
                  €{clientData.totalVisits > 0 
                    ? Math.round(Number(clientData.totalSpent) / clientData.totalVisits) 
                    : 0}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Favorite Services */}
          {sortedServices.length > 0 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">{t('clients.detail.favouriteServices')}</CardTitle>
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
          {clientData.notes && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">{t('common.notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{clientData.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{t('clients.detail.tags')}</CardTitle>
              {!isAddingTag && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setIsAddingTag(true)}
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('common.add')}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isAddingTag && (
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder={t('clients.detail.newTagPlaceholder')}
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTag();
                      if (e.key === 'Escape') {
                        setIsAddingTag(false);
                        setNewTag('');
                      }
                    }}
                    className="h-9"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleAddTag} className="h-9">
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      setIsAddingTag(false);
                      setNewTag('');
                    }}
                    className="h-9"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {clientData.tags && clientData.tags.length > 0 ? (
                  clientData.tags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="outline" 
                      className="group cursor-pointer hover:bg-destructive/10"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag}
                      <X className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Badge>
                  ))
                ) : (
                  !isAddingTag && (
                    <p className="text-sm text-muted-foreground">{t('clients.detail.noTags')}</p>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Appointment History */}
        <div className="lg:col-span-2">
          <Card className="border-border h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                {t(
                  clientData.bookings.length === 1
                    ? 'clients.detail.appointmentHistoryOne'
                    : 'clients.detail.appointmentHistoryOther',
                  { count: clientData.bookings.length }
                )}
              </CardTitle>
              <Button size="sm" onClick={openNewBooking} disabled={!isBookingDataReady}>
                <Plus className="h-4 w-4 mr-2" />
                {t('clients.detail.newAppointment')}
              </Button>
            </CardHeader>
            <CardContent>
              {clientData.bookings.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t('clients.detail.noAppointmentsYet')}</p>
                  <Button variant="outline" className="mt-4" onClick={openNewBooking} disabled={!isBookingDataReady}>
                    {t('clients.detail.bookFirstAppointment')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {clientData.bookings.map((booking) => {
                    const status = statusConfig[booking.status] || { label: booking.status, class: 'bg-muted text-muted-foreground' };
                    const isOpeningBooking = openingBookingId === booking.id;
                    return (
                      <div
                        key={booking.id}
                        role="button"
                        tabIndex={0}
                        aria-label={t('clients.detail.viewAppointmentAria', { service: booking.serviceName })}
                        aria-busy={isOpeningBooking}
                        onClick={() => handleBookingClick(booking.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleBookingClick(booking.id);
                          }
                        }}
                        className={cn(
                          'flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          isOpeningBooking && 'opacity-70'
                        )}
                      >
                        <div className="w-12 h-12 shrink-0 rounded-lg bg-card flex flex-col items-center justify-center border border-border">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(booking.date), 'MMM', { locale: dateLocale })}
                          </span>
                          <span className="font-bold">
                            {format(new Date(booking.date), 'd')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium truncate">{booking.serviceName}</span>
                            <Badge className={cn('text-xs shrink-0', status.class)}>
                              {status.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 md:gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 shrink-0" />
                              {booking.time}
                            </span>
                            <span>{booking.serviceDuration} min</span>
                          </div>
                          {booking.notes && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {t('clients.detail.notePrefix', { note: booking.notes })}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 md:gap-2 shrink-0">
                          <p className="font-bold">€{Number(booking.servicePrice).toFixed(2)}</p>
                          {isOpeningBooking ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
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
        client={clientData}
        onSave={handleSaveClient}
      />

      {/* Booking Detail Modal (opened from the appointment history) */}
      <BookingDetailModal
        booking={selectedApiBooking}
        open={isBookingDetailOpen}
        onClose={closeBookingDetail}
        onStatusChange={handleBookingStatusChange}
        onPaymentChange={handleBookingPaymentChange}
        onEdit={handleBookingEdit}
        onDelete={handleBookingDelete}
      />

      {/* Booking Modal: create with this client + last service/barber
          preselected, or edit an existing appointment */}
      <BookingModal
        open={isBookingModalOpen}
        onOpenChange={(open) => {
          setIsBookingModalOpen(open);
          if (!open) setEditingBooking(null);
        }}
        booking={editingBooking ? {
          id: editingBooking.id,
          clientId: editingBooking.client_id,
          clientName: editingBooking.client_name,
          clientPhone: editingBooking.client_phone,
          clientEmail: editingBooking.client_email || '',
          serviceId: editingBooking.service_id,
          serviceName: editingBooking.service_name,
          serviceDuration: editingBooking.service_duration,
          servicePrice: editingBooking.service_price,
          barber: editingBooking.barber,
          date: editingBooking.booking_date,
          time: editingBooking.start_time.substring(0, 5),
          endTime: editingBooking.end_time.substring(0, 5),
          status: editingBooking.status.replace('_', '-') as BookingStatus,
          source: editingBooking.source.replace('_', '-') as BookingSource,
          notes: editingBooking.notes || '',
          createdAt: editingBooking.created_at,
        } : null}
        clients={allClients}
        services={services}
        barbers={barbers}
        onSave={handleSaveBooking}
        preselectedClientId={clientData.id}
        preselectedServiceId={preselectedServiceId}
        preselectedBarberId={preselectedBarberId}
      />

      {/* Generic Confirmation Dialog */}
      <ConfirmActionDialog {...confirmDialogProps} />
    </div>
  );
}
