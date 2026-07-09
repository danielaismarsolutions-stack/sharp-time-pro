import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  Clock,
  Calendar,
  Bell,
  User,
  Save,
  Loader2,
  BellRing,
  AlertTriangle,
  Plus,
  Trash2,
  Upload,
  X,
  Fingerprint,
  Palette,
  Moon,
  Sun,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BusinessSettings,
  BusinessHours,
  BusinessHoursShift,
  BookingSettings,
  NotificationSettings,
} from '@/types';
import { supabaseBusinessHoursApi } from '@/services/supabaseBusinessHours';
import { supabaseHolidaysApi } from '@/services/supabaseHolidays';
import { supabaseBusinessesApi } from '@/services/supabaseBusinesses';
import { supabase } from '@/lib/supabase';
import { useBusinessSettings as useBusinessSettingsQuery, useBusinessHours as useBusinessHoursQuery, useClosureDates, useBookingSettingsQuery, useNotificationSettings as useNotificationSettingsQuery, useTimeTrackingSettings, useInvalidateQuery } from '@/hooks/useQueryHooks';
import { useToast } from '@/hooks/use-toast';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { getBusinessId } from '@/config/session';
import { notifyAllAdmins } from '@/services/supabaseNotifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useBusinessBrand } from '@/contexts/BusinessBrandContext';
import { useTheme } from '@/contexts/ThemeContext';

const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const dayLabels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const ADMIN_TABS = ['business', 'hours', 'booking', 'time-tracking', 'notifications', 'appearance', 'account'];
const BARBER_TABS = ['notifications', 'appearance', 'account'];

export default function Settings() {
  const { toast } = useToast();
  const { confirm, dialogProps: confirmDialogProps } = useConfirmAction();
  const { user, logout, isAdmin } = useAuth();
  const allowedTabs = isAdmin ? ADMIN_TABS : BARBER_TABS;
  const defaultTab = isAdmin ? 'business' : 'notifications';
  const { brand, updateLogoUrl } = useBusinessBrand();
  const { theme, setTheme } = useTheme();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    tabParam && allowedTabs.includes(tabParam) ? tabParam : defaultTab
  );

  useEffect(() => {
    if (tabParam && allowedTabs.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    } else if (tabParam && !allowedTabs.includes(tabParam)) {
      setActiveTab(defaultTab);
      setSearchParams(defaultTab === 'business' ? {} : { tab: defaultTab }, { replace: true });
    }
  }, [tabParam, allowedTabs]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams(value === defaultTab ? {} : { tab: value }, { replace: true });
  };
  const {
    permission,
    isSubscribed,
    isLoading: isPushLoading,
    isSupported: isPushSupported,
    toggle: togglePush
  } = usePushNotifications(user?.id || null, user?.businessId || null);

  // ── React Query hooks for cached settings data ──
  const { data: queryBusiness, isLoading: isLoadingBusiness } = useBusinessSettingsQuery();
  const { data: queryHours, isLoading: isLoadingHours } = useBusinessHoursQuery();
  const { data: queryClosures } = useClosureDates();
  const { data: queryBooking, isLoading: isLoadingBooking } = useBookingSettingsQuery();
  const { data: queryNotifications, isLoading: isLoadingNotifications } = useNotificationSettingsQuery();
  const { data: queryTimeTracking } = useTimeTrackingSettings();
  const { invalidateSettings, invalidateBusinessHours: invalidateBH, invalidateClosureDates, invalidateTimeTrackingSettings } = useInvalidateQuery();

  const isLoading = isLoadingBusiness || isLoadingHours || isLoadingBooking || isLoadingNotifications;
  const [isSaving, setIsSaving] = useState(false);

  const [businessSettings, setBusinessSettings] = useState({
    businessName: '',
    address: '',
    phone: '',
    email: '',
    contactEmail: '',
    description: '',
    logo: '',
  });

  const [businessHours, setBusinessHours] = useState<BusinessHours>({});
  const [bookingSettings, setBookingSettings] = useState<BookingSettings>({
    minAdvanceBooking: 1,
    maxAdvanceBooking: 30,
    onlineBookingEnabled: true,
    cancellationPolicy: '',
  });
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNewBooking: true,
    emailCancellation: true,
    emailReminder: true,
    reminderTiming: 24,
    smsEnabled: false,
  });

  // Sync query data into local form state
  useEffect(() => {
    if (queryBusiness) {
      setBusinessSettings((prev) => ({
        ...prev,
        businessName: queryBusiness.businessName,
        phone: queryBusiness.phone,
        address: queryBusiness.address,
        contactEmail: queryBusiness.contactEmail,
      }));
    }
  }, [queryBusiness]);

  useEffect(() => {
    if (queryHours) setBusinessHours(queryHours);
  }, [queryHours]);

  useEffect(() => {
    if (queryBooking) {
      setBookingSettings((prev) => ({
        ...prev,
        minAdvanceBooking: queryBooking.minAdvanceBooking,
        maxAdvanceBooking: queryBooking.maxAdvanceBooking,
      }));
    }
  }, [queryBooking]);

  useEffect(() => {
    if (queryNotifications) {
      setNotificationSettings((prev) => ({
        ...prev,
        emailReminder: queryNotifications.emailReminder,
        reminderTiming: queryNotifications.reminderTiming,
      }));
    }
  }, [queryNotifications]);

  // Real-time subscription for business_hours table
  useEffect(() => {
    if (!user?.businessId) return;

    const channel = supabase
      .channel('business_hours_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_hours',
          filter: `business_id=eq.${user.businessId}`,
        },
        () => {
          invalidateBH();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.businessId, invalidateBH]);

  // Real-time subscription for holidays (closure dates) table
  useEffect(() => {
    if (!user?.businessId) return;

    const channel = supabase
      .channel('holidays_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'holidays',
          filter: `business_id=eq.${user.businessId}`,
        },
        () => {
          invalidateClosureDates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.businessId, invalidateClosureDates]);

  // Closure dates (holidays) - local form state
  const [newClosureDate, setNewClosureDate] = useState('');
  const [newClosureName, setNewClosureName] = useState('');
  const [isAddingClosure, setIsAddingClosure] = useState(false);
  const [removingClosureId, setRemovingClosureId] = useState<string | null>(null);

  const closureDates = queryClosures ?? [];

  const addClosureDate = async () => {
    const dateStr = newClosureDate.trim();
    if (!dateStr) {
      toast({ title: 'Selecciona una fecha', variant: 'destructive' });
      return;
    }
    if (closureDates.some((c) => c.date === dateStr)) {
      toast({ title: 'Esa fecha ya está marcada como cerrada', variant: 'destructive' });
      return;
    }

    setIsAddingClosure(true);
    try {
      await supabaseHolidaysApi.add({
        date: dateStr,
        name: newClosureName.trim() || null,
      });
      try {
        await notifyAllAdmins({
          business_id: getBusinessId(),
          type: 'business_hours_modified',
          title: 'Fecha de cierre añadida',
          message: `${user?.name || 'Usuario'} añadió una fecha de cierre (${dateStr})`,
          metadata: { modified_by: user?.name, closure_date: dateStr },
        });
      } catch { /* ignored */ }
      invalidateClosureDates();
      setNewClosureDate('');
      setNewClosureName('');
      toast({ title: 'Fecha de cierre añadida' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al añadir la fecha';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsAddingClosure(false);
    }
  };

  const removeClosureDate = async (id: string, dateLabel: string) => {
    const confirmed = await confirm({
      title: 'Eliminar fecha de cierre',
      description: `¿Eliminar la fecha de cierre del ${dateLabel}?`,
      confirmLabel: 'Eliminar',
      variant: 'destructive',
    });
    if (!confirmed) return;

    setRemovingClosureId(id);
    try {
      await supabaseHolidaysApi.remove(id);
      invalidateClosureDates();
      toast({ title: 'Fecha de cierre eliminada' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al eliminar la fecha';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setRemovingClosureId(null);
    }
  };

  const formatClosureDate = (iso: string): string => {
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return iso;
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  };

  const todayIso = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Solo se permiten imágenes', variant: 'destructive' });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'La imagen debe ser menor a 2MB', variant: 'destructive' });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const businessId = getBusinessId();
      const ext = file.name.split('.').pop() || 'png';
      const filePath = `${businessId}/logo.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('business-logos')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Save URL to business record
      await supabaseBusinessesApi.update({ logoUrl: publicUrl });
      updateLogoUrl(publicUrl);

      toast({ title: 'Logo actualizado' });
    } catch (error) {
      console.error('Logo upload error:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast({
        title: 'Error al subir el logo',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsUploadingLogo(false);
      // Reset input so the same file can be selected again
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    const confirmed = await confirm({
      title: 'Eliminar logo',
      description: '¿Estás seguro de que quieres eliminar el logo del negocio?',
      confirmLabel: 'Eliminar',
    });
    if (!confirmed) return;

    setIsUploadingLogo(true);
    try {
      await supabaseBusinessesApi.update({ logoUrl: null });
      updateLogoUrl(null);
      toast({ title: 'Logo eliminado' });
    } catch {
      toast({ title: 'Error al eliminar el logo', variant: 'destructive' });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const saveBusinessSettings = async () => {
    const confirmed = await confirm({
      title: 'Guardar configuración del negocio',
      description: '¿Confirmar los cambios en la configuración del negocio?',
      confirmLabel: 'Guardar',
    });
    if (!confirmed) return;

    setIsSaving(true);
    try {
      await supabaseBusinessesApi.update({
        businessName: businessSettings.businessName,
        phone: businessSettings.phone,
        address: businessSettings.address,
        contactEmail: businessSettings.contactEmail,
      });

      // Notify all admins about business settings update
      try {
        await notifyAllAdmins({
          business_id: getBusinessId(),
          type: 'business_settings_modified',
          title: 'Configuración del negocio modificada',
          message: `${user?.name || 'Usuario'} actualizó la configuración del negocio`,
          metadata: {
            modified_by: user?.name,
          },
        });
      } catch { /* ignored */ }

      invalidateSettings();
      toast({ title: 'Configuración guardada' });
    } catch (error) {
      toast({ title: 'Error al guardar configuración', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const saveHoursSettings = async () => {
    const confirmed = await confirm({
      title: 'Guardar horario del negocio',
      description: '¿Confirmar los cambios en el horario del negocio?',
      confirmLabel: 'Guardar',
    });
    if (!confirmed) return;

    setIsSaving(true);
    try {
      await supabaseBusinessHoursApi.saveAll(businessHours);

      // Notify all admins about business hours update
      try {
        await notifyAllAdmins({
          business_id: getBusinessId(),
          type: 'business_hours_modified',
          title: 'Horario del negocio modificado',
          message: `${user?.name || 'Usuario'} actualizó el horario del negocio`,
          metadata: {
            modified_by: user?.name,
          },
        });
      } catch { /* ignored */ }

      invalidateSettings();
      invalidateBH();
      toast({ title: 'Horario guardado' });
    } catch (error) {
      toast({ title: 'Error al guardar configuración', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const saveBookingSettings = async () => {
    const confirmed = await confirm({
      title: 'Guardar configuración de reservas',
      description: '¿Confirmar los cambios en la configuración de reservas?',
      confirmLabel: 'Guardar',
    });
    if (!confirmed) return;

    setIsSaving(true);
    try {
      await supabaseBusinessesApi.updateBookingSettings({
        minAdvanceBooking: bookingSettings.minAdvanceBooking,
        maxAdvanceBooking: bookingSettings.maxAdvanceBooking,
      });
      invalidateSettings();
      toast({ title: 'Configuración de reservas guardada' });
    } catch (error) {
      toast({ title: 'Error al guardar configuración', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const saveNotificationSettings = async () => {
    const confirmed = await confirm({
      title: 'Guardar configuración de notificaciones',
      description: '¿Confirmar los cambios en la configuración de notificaciones?',
      confirmLabel: 'Guardar',
    });
    if (!confirmed) return;

    setIsSaving(true);
    try {
      await supabaseBusinessesApi.updateNotificationSettings({
        emailReminder: notificationSettings.emailReminder,
        reminderTiming: notificationSettings.reminderTiming,
      });
      invalidateSettings();
      toast({ title: 'Configuración de notificaciones guardada' });
    } catch (error) {
      toast({ title: 'Error al guardar configuración', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDayOpen = (day: string, isOpen: boolean) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: {
        isOpen,
        shifts: isOpen && (!prev[day] || prev[day].shifts.length === 0)
          ? [{ openTime: '09:00', closeTime: '18:00' }]
          : prev[day]?.shifts || [],
      },
    }));
  };

  const addShift = (day: string) => {
    setBusinessHours((prev) => {
      const current = prev[day] || { isOpen: true, shifts: [] };
      const lastShift = current.shifts[current.shifts.length - 1];
      const newOpenTime = lastShift ? lastShift.closeTime : '09:00';
      return {
        ...prev,
        [day]: {
          ...current,
          shifts: [...current.shifts, { openTime: newOpenTime, closeTime: '20:00' }],
        },
      };
    });
  };

  const removeShift = (day: string, shiftIndex: number) => {
    setBusinessHours((prev) => {
      const current = prev[day];
      if (!current) return prev;
      return {
        ...prev,
        [day]: {
          ...current,
          shifts: current.shifts.filter((_, i) => i !== shiftIndex),
        },
      };
    });
  };

  const updateShift = (day: string, shiftIndex: number, updates: Partial<BusinessHoursShift>) => {
    setBusinessHours((prev) => {
      const current = prev[day];
      if (!current) return prev;
      return {
        ...prev,
        [day]: {
          ...current,
          shifts: current.shifts.map((shift, i) =>
            i === shiftIndex ? { ...shift, ...updates } : shift
          ),
        },
      };
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Ajustes</h1>
        <p className="text-muted-foreground text-sm">Gestiona la configuración de tu negocio</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 md:space-y-6">
        <TabsList className="w-full overflow-x-auto flex justify-start h-auto p-1">
          {isAdmin && (
            <TabsTrigger value="business" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 min-h-[40px]">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Negocio</span>
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="hours" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 min-h-[40px]">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Horario</span>
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="booking" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 min-h-[40px]">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Reservas</span>
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="time-tracking" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 min-h-[40px]">
              <Fingerprint className="h-4 w-4" />
              <span className="hidden sm:inline">Fichajes</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="notifications" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 min-h-[40px]">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notif.</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 min-h-[40px]">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Apariencia</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 min-h-[40px]">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Cuenta</span>
          </TabsTrigger>
        </TabsList>

        {/* Business Settings */}
        {isAdmin && <TabsContent value="business">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Perfil del Negocio</CardTitle>
              <CardDescription>
                Información de tu negocio visible para los clientes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label>Logo del Negocio</Label>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                    {brand.logoUrl ? (
                      <img
                        src={brand.logoUrl}
                        alt="Logo del negocio"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    )}
                    {isUploadingLogo && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={isUploadingLogo}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {brand.logoUrl ? 'Cambiar logo' : 'Subir logo'}
                      </Button>
                      {brand.logoUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveLogo}
                          disabled={isUploadingLogo}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Eliminar
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG o SVG. Máximo 2MB.
                    </p>
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre del Negocio</Label>
                  <Input
                    value={businessSettings.businessName}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, businessName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={businessSettings.phone}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Correo electrónico de contacto</Label>
                  <Input
                    type="email"
                    value={businessSettings.contactEmail}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, contactEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Input
                    value={businessSettings.address}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, address: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={businessSettings.description}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, description: e.target.value })}
                  rows={3}
                />
              </div>
              <Button onClick={saveBusinessSettings} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Guardar Cambios
              </Button>
            </CardContent>
          </Card>
        </TabsContent>}

        {/* Business Hours */}
        {isAdmin && <TabsContent value="hours">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Horario del Negocio</CardTitle>
              <CardDescription>Configura el horario de apertura para cada día. Puedes añadir varios turnos por día.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dayNames.map((day, index) => {
                const dayData = businessHours[day] || { isOpen: false, shifts: [] };
                return (
                  <div key={day} className="rounded-lg border p-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={dayData.isOpen}
                        onCheckedChange={(checked) => toggleDayOpen(day, checked)}
                      />
                      <Label className="font-semibold w-24">{dayLabels[index]}</Label>
                      {!dayData.isOpen && (
                        <span className="text-muted-foreground text-sm">Cerrado</span>
                      )}
                    </div>
                    {dayData.isOpen && (
                      <div className="pl-0 md:pl-12 space-y-2 mt-2">
                        {dayData.shifts.map((shift, shiftIndex) => (
                          <div key={shiftIndex} className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                            <span className="text-xs text-muted-foreground w-auto md:w-16 shrink-0">Turno {shiftIndex + 1}</span>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Input
                                type="time"
                                value={shift.openTime}
                                onChange={(e) => updateShift(day, shiftIndex, { openTime: e.target.value })}
                                className="w-full md:w-32 min-w-0"
                              />
                              <span className="text-muted-foreground shrink-0">a</span>
                              <Input
                                type="time"
                                value={shift.closeTime}
                                onChange={(e) => updateShift(day, shiftIndex, { closeTime: e.target.value })}
                                className="w-full md:w-32 min-w-0"
                              />
                              {dayData.shifts.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeShift(day, shiftIndex)}
                                  className="h-10 w-10 md:h-8 md:w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addShift(day)}
                          className="border-dashed text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Añadir turno
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
              <Button onClick={saveHoursSettings} disabled={isSaving} className="mt-4">
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Guardar Horario
              </Button>
            </CardContent>
          </Card>

          {/* Closure Dates (Festivos / Días cerrados) */}
          <Card className="border-border mt-4 md:mt-6">
            <CardHeader>
              <CardTitle>Días Cerrados (festivos y cierres puntuales)</CardTitle>
              <CardDescription>
                Marca fechas concretas en las que el negocio estará cerrado, como festivos o vacaciones.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-2 md:gap-3 items-end">
                <div className="space-y-2">
                  <Label htmlFor="closure-date">Fecha</Label>
                  <Input
                    id="closure-date"
                    type="date"
                    min={todayIso}
                    value={newClosureDate}
                    onChange={(e) => setNewClosureDate(e.target.value)}
                    className="w-full md:w-44"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closure-name">Motivo (opcional)</Label>
                  <Input
                    id="closure-name"
                    type="text"
                    placeholder="Ej: Navidad, vacaciones, festivo local"
                    value={newClosureName}
                    maxLength={120}
                    onChange={(e) => setNewClosureName(e.target.value)}
                  />
                </div>
                <Button
                  onClick={addClosureDate}
                  disabled={isAddingClosure || !newClosureDate}
                  className="w-full md:w-auto"
                >
                  {isAddingClosure ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Añadir
                </Button>
              </div>

              {closureDates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay fechas de cierre registradas.
                </p>
              ) : (
                <ul className="space-y-2">
                  {closureDates.map((closure) => {
                    const label = formatClosureDate(closure.date);
                    return (
                      <li
                        key={closure.id}
                        className="flex items-center justify-between gap-3 rounded-lg border p-3"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-sm capitalize truncate">{label}</p>
                          {closure.name && (
                            <p className="text-xs text-muted-foreground truncate">{closure.name}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeClosureDate(closure.id, label)}
                          disabled={removingClosureId === closure.id}
                          className="h-10 w-10 md:h-8 md:w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          aria-label={`Eliminar ${label}`}
                        >
                          {removingClosureId === closure.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>}

        {/* Booking Settings */}
        {isAdmin && <TabsContent value="booking">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Configuración de Reservas</CardTitle>
              <CardDescription>Configura cómo los clientes pueden reservar citas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Habilitar Reservas Online</Label>
                  <p className="text-sm text-muted-foreground">
                    Permitir que los clientes reserven citas online
                  </p>
                </div>
                <Switch
                  checked={bookingSettings.onlineBookingEnabled}
                  onCheckedChange={(checked) =>
                    setBookingSettings({ ...bookingSettings, onlineBookingEnabled: checked })
                  }
                />
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Antelación Mínima</Label>
                  <Select
                    value={bookingSettings.minAdvanceBooking.toString()}
                    onValueChange={(value) =>
                      setBookingSettings({ ...bookingSettings, minAdvanceBooking: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sin mínimo</SelectItem>
                      <SelectItem value="1">1 hora</SelectItem>
                      <SelectItem value="2">2 horas</SelectItem>
                      <SelectItem value="4">4 horas</SelectItem>
                      <SelectItem value="24">24 horas</SelectItem>
                      <SelectItem value="48">48 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Antelación Máxima</Label>
                  <Select
                    value={bookingSettings.maxAdvanceBooking.toString()}
                    onValueChange={(value) =>
                      setBookingSettings({ ...bookingSettings, maxAdvanceBooking: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 días</SelectItem>
                      <SelectItem value="14">14 días</SelectItem>
                      <SelectItem value="30">30 días</SelectItem>
                      <SelectItem value="60">60 días</SelectItem>
                      <SelectItem value="90">90 días</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Política de Cancelación</Label>
                <Textarea
                  value={bookingSettings.cancellationPolicy}
                  onChange={(e) =>
                    setBookingSettings({ ...bookingSettings, cancellationPolicy: e.target.value })
                  }
                  rows={3}
                  placeholder="Introduce el texto de tu política de cancelación..."
                />
              </div>
              <Button onClick={saveBookingSettings} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Guardar Configuración
              </Button>
            </CardContent>
          </Card>
        </TabsContent>}

        {/* Time Tracking Settings */}
        {isAdmin && <TabsContent value="time-tracking">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5" />
                Control de Fichajes
              </CardTitle>
              <CardDescription>
                Permite a tus empleados fichar entrada y salida para registrar sus horas trabajadas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="time-tracking-enabled" className="text-base font-medium">
                    Activar sistema de fichajes
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Al activarlo, aparecerá la sección "Fichajes" en el menú para todos los empleados.
                    Podrán fichar entrada al llegar y salida al irse.
                  </p>
                </div>
                <Switch
                  id="time-tracking-enabled"
                  checked={queryTimeTracking?.timeTrackingEnabled ?? false}
                  onCheckedChange={async (checked) => {
                    try {
                      await supabaseBusinessesApi.updateTimeTrackingSettings(checked);
                      invalidateTimeTrackingSettings();
                      toast({
                        title: checked ? 'Fichajes activados' : 'Fichajes desactivados',
                        description: checked
                          ? 'Tus empleados ya pueden fichar entrada y salida.'
                          : 'El sistema de fichajes ha sido desactivado.',
                      });
                    } catch {
                      toast({
                        title: 'Error',
                        description: 'No se pudo actualizar la configuración.',
                        variant: 'destructive',
                      });
                    }
                  }}
                />
              </div>

              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm">Como funciona</h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex gap-2">
                    <span className="text-green-500 font-bold">1.</span>
                    Los empleados fichan entrada al llegar con un solo click.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-500 font-bold">2.</span>
                    Fichan salida al terminar su jornada.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-500 font-bold">3.</span>
                    Si olvidan fichar salida, el sistema cierra automaticamente a las 23:00 usando el horario programado del empleado.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-500 font-bold">4.</span>
                    Los administradores pueden ver todos los registros y corregir errores.
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>}

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Configuración de Notificaciones</CardTitle>
              <CardDescription>Configura las notificaciones por email y SMS</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Push Notifications Section */}
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <BellRing className="h-4 w-4" />
                  Notificaciones Push
                </h3>
                {isPushSupported ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Activar notificaciones push</Label>
                        <p className="text-sm text-muted-foreground">
                          Recibe alertas instantáneas en tu dispositivo
                        </p>
                      </div>
                      <Switch
                        checked={isSubscribed}
                        onCheckedChange={togglePush}
                        disabled={isPushLoading || permission === 'denied'}
                      />
                    </div>
                    {permission === 'denied' && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Las notificaciones están bloqueadas. Habilítalas en la configuración de tu navegador.
                        </AlertDescription>
                      </Alert>
                    )}
                    {isSubscribed && (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        ✓ Notificaciones push activadas
                      </p>
                    )}
                  </div>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Tu navegador no soporta notificaciones push.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <Separator />
              
              {/* Email Notifications Section */}
              <div className="space-y-4">
                <h3 className="font-medium">Notificaciones por Email</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Notificaciones de Nueva Reserva</Label>
                      <p className="text-sm text-muted-foreground">
                        Recibe un email cuando se realice una nueva reserva
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.emailNewBooking}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, emailNewBooking: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Notificaciones de Cancelación</Label>
                      <p className="text-sm text-muted-foreground">
                        Recibe un email cuando se cancele una reserva
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.emailCancellation}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, emailCancellation: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Notificaciones de Recordatorio</Label>
                      <p className="text-sm text-muted-foreground">
                        Enviar recordatorios a los clientes antes de sus citas
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.emailReminder}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, emailReminder: checked })
                      }
                    />
                  </div>
                  {notificationSettings.emailReminder && (
                    <div className="space-y-2 pl-4">
                      <Label>Enviar recordatorio antes de</Label>
                      <Select
                        value={notificationSettings.reminderTiming.toString()}
                        onValueChange={(value) =>
                          setNotificationSettings({ ...notificationSettings, reminderTiming: parseInt(value) })
                        }
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 horas</SelectItem>
                          <SelectItem value="4">4 horas</SelectItem>
                          <SelectItem value="12">12 horas</SelectItem>
                          <SelectItem value="24">24 horas</SelectItem>
                          <SelectItem value="48">48 horas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h3 className="font-medium">Notificaciones SMS</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Habilitar SMS</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar notificaciones SMS a los clientes (requiere integración)
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.smsEnabled}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({ ...notificationSettings, smsEnabled: checked })
                    }
                  />
                </div>
              </div>
              <Button onClick={saveNotificationSettings} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Guardar Configuración
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Apariencia
              </CardTitle>
              <CardDescription>
                Elige cómo quieres ver la aplicación. Tu preferencia se guarda en tu cuenta y se
                aplica en todos tus dispositivos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Label>Tema</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                {([
                  { value: 'light', label: 'Claro', description: 'Fondo blanco', icon: Sun },
                  { value: 'dark', label: 'Oscuro', description: 'Fondo negro', icon: Moon },
                ] as const).map((option) => {
                  const isSelected = theme === option.value;
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTheme(option.value)}
                      aria-pressed={isSelected}
                      className={`relative flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:bg-accent'
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium">{option.label}</span>
                        <span className="block text-sm text-muted-foreground">{option.description}</span>
                      </span>
                      {isSelected && (
                        <Check className="absolute top-3 right-3 h-4 w-4 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Settings */}
        <TabsContent value="account">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Configuración de Cuenta</CardTitle>
              <CardDescription>Gestiona tu cuenta y seguridad</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">
                    {user?.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-medium">Cambiar Contraseña</h3>
                <div className="grid gap-4 max-w-sm">
                  <div className="space-y-2">
                    <Label>Contraseña Actual</Label>
                    <Input type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nueva Contraseña</Label>
                    <Input type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirmar Nueva Contraseña</Label>
                    <Input type="password" />
                  </div>
                  <Button variant="outline">Actualizar Contraseña</Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-medium">Zona de Peligro</h3>
                <Button variant="destructive" onClick={logout}>
                  Cerrar sesión en todos los dispositivos
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Generic Confirmation Dialog */}
      <ConfirmActionDialog {...confirmDialogProps} />
    </div>
  );
}
