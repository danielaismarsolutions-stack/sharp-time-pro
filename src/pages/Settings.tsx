import { useState, useEffect } from 'react';
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
import { settingsApi } from '@/services/api';
import { supabaseBusinessHoursApi } from '@/services/supabaseBusinessHours';
import { supabaseBusinessesApi } from '@/services/supabaseBusinesses';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { getBusinessId } from '@/config/session';
import { notifyAllAdmins } from '@/services/supabaseNotifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const dayLabels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const VALID_TABS = ['business', 'hours', 'booking', 'notifications', 'account'];

export default function Settings() {
  const { toast } = useToast();
  const { confirm, dialogProps: confirmDialogProps } = useConfirmAction();
  const { user, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'business'
  );

  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams(value === 'business' ? {} : { tab: value }, { replace: true });
  };
  const {
    permission,
    isSubscribed,
    isLoading: isPushLoading,
    isSupported: isPushSupported,
    toggle: togglePush
  } = usePushNotifications(user?.id || null, user?.businessId || null);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time subscription for business_hours table
  // Refetches all hours on any change (multiple rows per day makes partial merges complex)
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
          supabaseBusinessHoursApi.getAll().then(setBusinessHours).catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.businessId]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const [businessData, hours, bookingAdvance, notifications] = await Promise.all([
        supabaseBusinessesApi.get(),
        supabaseBusinessHoursApi.getAll(),
        supabaseBusinessesApi.getBookingSettings(),
        settingsApi.getNotificationSettings(),
      ]);
      setBusinessSettings((prev) => ({
        ...prev,
        businessName: businessData.businessName,
        phone: businessData.phone,
        address: businessData.address,
        contactEmail: businessData.contactEmail,
      }));
      setBusinessHours(hours);
      setBookingSettings((prev) => ({
        ...prev,
        minAdvanceBooking: bookingAdvance.minAdvanceBooking,
        maxAdvanceBooking: bookingAdvance.maxAdvanceBooking,
      }));
      setNotificationSettings(notifications);
    } catch (error) {
      toast({ title: 'Error al cargar configuración', variant: 'destructive' });
    } finally {
      setIsLoading(false);
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
      await settingsApi.updateNotificationSettings(notificationSettings);
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
          <TabsTrigger value="business" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 min-h-[40px]">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Negocio</span>
          </TabsTrigger>
          <TabsTrigger value="hours" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 min-h-[40px]">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Horario</span>
          </TabsTrigger>
          <TabsTrigger value="booking" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 min-h-[40px]">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Reservas</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 min-h-[40px]">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notif.</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 min-h-[40px]">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Cuenta</span>
          </TabsTrigger>
        </TabsList>

        {/* Business Settings */}
        <TabsContent value="business">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Perfil del Negocio</CardTitle>
              <CardDescription>
                Información de tu negocio visible para los clientes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
        </TabsContent>

        {/* Business Hours */}
        <TabsContent value="hours">
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
                                className="w-full md:w-32 min-w-[100px]"
                              />
                              <span className="text-muted-foreground shrink-0">a</span>
                              <Input
                                type="time"
                                value={shift.closeTime}
                                onChange={(e) => updateShift(day, shiftIndex, { closeTime: e.target.value })}
                                className="w-full md:w-32 min-w-[100px]"
                              />
                              {dayData.shifts.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeShift(day, shiftIndex)}
                                  className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
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
        </TabsContent>

        {/* Booking Settings */}
        <TabsContent value="booking">
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
        </TabsContent>

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
