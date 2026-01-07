import { useState, useEffect } from 'react';
import {
  Building2,
  Clock,
  Calendar,
  Bell,
  User,
  Save,
  Loader2,
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
import {
  BusinessSettings,
  BusinessHours,
  BookingSettings,
  NotificationSettings,
} from '@/types';
import { settingsApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Settings() {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({
    businessName: '',
    address: '',
    phone: '',
    email: '',
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
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const [business, hours, booking, notifications] = await Promise.all([
        settingsApi.getBusinessSettings(),
        settingsApi.getBusinessHours(),
        settingsApi.getBookingSettings(),
        settingsApi.getNotificationSettings(),
      ]);
      setBusinessSettings(business);
      setBusinessHours(hours);
      setBookingSettings(booking);
      setNotificationSettings(notifications);
    } catch (error) {
      toast({ title: 'Error loading settings', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const saveBusinessSettings = async () => {
    setIsSaving(true);
    try {
      await settingsApi.updateBusinessSettings(businessSettings);
      toast({ title: 'Business settings saved' });
    } catch (error) {
      toast({ title: 'Error saving settings', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const saveHoursSettings = async () => {
    setIsSaving(true);
    try {
      await settingsApi.updateBusinessHours(businessHours);
      toast({ title: 'Business hours saved' });
    } catch (error) {
      toast({ title: 'Error saving settings', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const saveBookingSettings = async () => {
    setIsSaving(true);
    try {
      await settingsApi.updateBookingSettings(bookingSettings);
      toast({ title: 'Booking settings saved' });
    } catch (error) {
      toast({ title: 'Error saving settings', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const saveNotificationSettings = async () => {
    setIsSaving(true);
    try {
      await settingsApi.updateNotificationSettings(notificationSettings);
      toast({ title: 'Notification settings saved' });
    } catch (error) {
      toast({ title: 'Error saving settings', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const updateHours = (day: string, field: 'isOpen' | 'openTime' | 'closeTime', value: any) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your business configuration</p>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList>
          <TabsTrigger value="business" className="gap-2">
            <Building2 className="h-4 w-4" />
            Business
          </TabsTrigger>
          <TabsTrigger value="hours" className="gap-2">
            <Clock className="h-4 w-4" />
            Hours
          </TabsTrigger>
          <TabsTrigger value="booking" className="gap-2">
            <Calendar className="h-4 w-4" />
            Booking
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-2">
            <User className="h-4 w-4" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* Business Settings */}
        <TabsContent value="business">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Business Profile</CardTitle>
              <CardDescription>
                Your business information displayed to customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <Input
                    value={businessSettings.businessName}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, businessName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={businessSettings.phone}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={businessSettings.email}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={businessSettings.address}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, address: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={businessSettings.description}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, description: e.target.value })}
                  rows={3}
                />
              </div>
              <Button onClick={saveBusinessSettings} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Hours */}
        <TabsContent value="hours">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Business Hours</CardTitle>
              <CardDescription>Set your operating hours for each day</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dayNames.map((day, index) => {
                const hours = businessHours[day] || { isOpen: false, openTime: '09:00', closeTime: '18:00' };
                return (
                  <div key={day} className="flex items-center gap-4">
                    <div className="w-28">
                      <Label>{dayLabels[index]}</Label>
                    </div>
                    <Switch
                      checked={hours.isOpen}
                      onCheckedChange={(checked) => updateHours(day, 'isOpen', checked)}
                    />
                    {hours.isOpen && (
                      <>
                        <Input
                          type="time"
                          value={hours.openTime}
                          onChange={(e) => updateHours(day, 'openTime', e.target.value)}
                          className="w-32"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={hours.closeTime}
                          onChange={(e) => updateHours(day, 'closeTime', e.target.value)}
                          className="w-32"
                        />
                      </>
                    )}
                    {!hours.isOpen && (
                      <span className="text-muted-foreground">Closed</span>
                    )}
                  </div>
                );
              })}
              <Button onClick={saveHoursSettings} disabled={isSaving} className="mt-4">
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Hours
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Booking Settings */}
        <TabsContent value="booking">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Booking Settings</CardTitle>
              <CardDescription>Configure how customers can book appointments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Online Booking</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow customers to book appointments online
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
                  <Label>Minimum Advance Booking</Label>
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
                      <SelectItem value="0">No minimum</SelectItem>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="2">2 hours</SelectItem>
                      <SelectItem value="4">4 hours</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                      <SelectItem value="48">48 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Maximum Advance Booking</Label>
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
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cancellation Policy</Label>
                <Textarea
                  value={bookingSettings.cancellationPolicy}
                  onChange={(e) =>
                    setBookingSettings({ ...bookingSettings, cancellationPolicy: e.target.value })
                  }
                  rows={3}
                  placeholder="Enter your cancellation policy text..."
                />
              </div>
              <Button onClick={saveBookingSettings} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure email and SMS notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Email Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>New Booking Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive email when a new booking is made
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
                      <Label>Cancellation Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive email when a booking is cancelled
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
                      <Label>Reminder Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Send reminders to customers before appointments
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
                      <Label>Send reminder before</Label>
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
                          <SelectItem value="2">2 hours</SelectItem>
                          <SelectItem value="4">4 hours</SelectItem>
                          <SelectItem value="12">12 hours</SelectItem>
                          <SelectItem value="24">24 hours</SelectItem>
                          <SelectItem value="48">48 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h3 className="font-medium">SMS Notifications</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable SMS</Label>
                    <p className="text-sm text-muted-foreground">
                      Send SMS notifications to customers (requires integration)
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
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Settings */}
        <TabsContent value="account">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Manage your account and security</CardDescription>
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
                <h3 className="font-medium">Change Password</h3>
                <div className="grid gap-4 max-w-sm">
                  <div className="space-y-2">
                    <Label>Current Password</Label>
                    <Input type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm New Password</Label>
                    <Input type="password" />
                  </div>
                  <Button variant="outline">Update Password</Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-medium">Danger Zone</h3>
                <Button variant="destructive" onClick={logout}>
                  Logout from all devices
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
