import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Barber, CreateBarberData, DEFAULT_SCHEDULE } from '@/types/barber';
import { Loader2 } from 'lucide-react';
import AvatarUpload from './AvatarUpload';
import { supabaseStorageApi } from '@/services/supabaseStorage';
import { useToast } from '@/hooks/use-toast';
import { useStaffTerms } from '@/hooks/useStaffTerms';
import { useTranslation } from '@/contexts/LanguageContext';
import { BARBER_COLOR_PALETTE } from '@/components/calendar/shared/colorUtils';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BarberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barber: Barber | null;
  onSave: (data: CreateBarberData, avatarFile?: File | null) => Promise<void>;
}

export default function BarberModal({ open, onOpenChange, barber, onSave }: BarberModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'barber' | 'admin'>('barber');
  const [isActive, setIsActive] = useState(true);
  const [appointmentColor, setAppointmentColor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [deleteAvatar, setDeleteAvatar] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { toast } = useToast();
  const staffTerms = useStaffTerms();
  const { t } = useTranslation();

  const isCreating = !barber;

  useEffect(() => {
    if (barber) {
      setName(barber.name);
      setEmail(barber.email || '');
      setPhone(barber.phone || '');
      setBio(barber.bio || '');
      setIsActive(barber.is_active);
      setAppointmentColor(barber.appointment_color ?? null);
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setBio('');
      setPassword('');
      setRole('barber');
      setIsActive(true);
      setAppointmentColor(null);
    }
    setAvatarFile(null);
    setDeleteAvatar(false);
  }, [barber, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      let avatarUrl = barber?.avatar_url || null;

      // Handle avatar deletion
      if (deleteAvatar && barber?.avatar_url) {
        try {
          await supabaseStorageApi.deleteAvatar(barber.avatar_url);
          avatarUrl = null;
        } catch { /* ignored */ }
      }

      // Handle avatar upload if a new file was selected (only for existing barbers)
      if (avatarFile && barber) {
        setUploadingAvatar(true);
        try {
          if (barber.avatar_url) {
            await supabaseStorageApi.deleteAvatar(barber.avatar_url);
          }
          const result = await supabaseStorageApi.uploadAvatar(avatarFile, barber.id);
          avatarUrl = result.url;
        } catch (uploadError: unknown) {
          toast({
            title: t('common.error'),
            description: t('barbers.modal.photoUploadFailed', { staff: staffTerms.singular }),
            variant: 'destructive',
          });
        } finally {
          setUploadingAvatar(false);
        }
      }

      // Validate color: must be one of the palette hexes or null. Anything
      // else gets coerced to null so we can never violate the DB CHECK
      // constraint or store malformed values.
      const validHex = BARBER_COLOR_PALETTE.some((p) => p.hex === appointmentColor);
      const safeColor = validHex ? appointmentColor : null;

      const barberData: CreateBarberData = {
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
        schedule: barber?.schedule || DEFAULT_SCHEDULE,
        is_active: isActive,
        appointment_color: safeColor,
        ...(isCreating ? { password, role } : {}),
      };

      // For new barbers with avatar, pass the file to parent to handle upload after creation
      await onSave(barberData, barber ? null : avatarFile);

      onOpenChange(false);
    } catch (error) {
      // Error toast is handled by parent component
    } finally {
      setSaving(false);
      setUploadingAvatar(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-0 left-0 translate-x-0 translate-y-0 w-screen max-w-none h-[100dvh] max-h-[100dvh] rounded-none border-0 overflow-y-auto pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:w-[calc(100%-3rem)] sm:max-w-[340px] sm:h-auto sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl sm:border sm:p-4">
        <DialogHeader>
          <DialogTitle>{barber ? t('barbers.modal.editTitle', { staff: staffTerms.singularCap }) : t('barbers.modal.newTitle', { staff: staffTerms.singularCap })}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="name" className="text-xs">{t('common.name')} *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('barbers.modal.namePlaceholder', { staff: staffTerms.singular })}
              required
              className="h-8 text-xs"
            />
          </div>

          <AvatarUpload
            currentAvatarUrl={deleteAvatar ? null : (barber?.avatar_url || null)}
            onFileSelect={(file) => {
              setAvatarFile(file);
              if (file) setDeleteAvatar(false);
            }}
            onDeleteAvatar={() => setDeleteAvatar(true)}
            disabled={saving || uploadingAvatar}
            barberName={name}
          />

          <div className="space-y-1">
            <Label htmlFor="email" className="text-xs">{t('common.email')} {isCreating && '*'}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('barbers.modal.emailPlaceholder')}
              required={isCreating}
              className="h-8 text-xs"
            />
          </div>

          {isCreating && (
            <div className="space-y-1">
              <Label htmlFor="password" className="text-xs">{t('barbers.modal.passwordLabel')} *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('barbers.modal.passwordPlaceholder')}
                required
                minLength={6}
                className="h-8 text-xs"
              />
            </div>
          )}

          {isCreating && (
            <div className="space-y-1">
              <Label className="text-xs">{t('barbers.modal.roleLabel')}</Label>
              <Select value={role} onValueChange={(v) => setRole(v as 'barber' | 'admin')}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="barber">{staffTerms.singularCap}</SelectItem>
                  <SelectItem value="admin">{t('barbers.modal.roleAdmin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="phone" className="text-xs">{t('common.phone')}</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('barbers.modal.phonePlaceholder')}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="bio" className="text-xs">{t('barbers.modal.bioLabel')}</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t('barbers.modal.bioPlaceholder', { staff: staffTerms.singular })}
              rows={2}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t('barbers.modal.colorLabel')}</Label>
            <p className="text-[10px] text-muted-foreground leading-tight">
              {t('barbers.modal.colorHelp', { staff: staffTerms.singular })}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setAppointmentColor(null)}
                className={cn(
                  'h-7 px-2 rounded-md border text-[10px] transition-colors',
                  appointmentColor === null
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background hover:bg-muted'
                )}
                aria-pressed={appointmentColor === null}
                aria-label={t('barbers.modal.colorAutoAria')}
              >
                {t('barbers.modal.colorAuto')}
              </button>
              {BARBER_COLOR_PALETTE.map((opt) => {
                const selected = appointmentColor === opt.hex;
                return (
                  <button
                    key={opt.hex}
                    type="button"
                    onClick={() => setAppointmentColor(opt.hex)}
                    className={cn(
                      'h-7 w-7 rounded-md border flex items-center justify-center transition-transform',
                      selected ? 'border-foreground ring-2 ring-foreground/20' : 'border-border hover:scale-110'
                    )}
                    style={{ backgroundColor: opt.hex }}
                    aria-pressed={selected}
                    aria-label={t(opt.labelKey)}
                    title={t(opt.labelKey)}
                  >
                    {selected && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
            <Label htmlFor="active" className="text-xs">{t('barbers.modal.activeLabel')}</Label>
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" className="text-xs h-8" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" size="sm" className="text-xs h-8" disabled={saving || uploadingAvatar || !name.trim() || (isCreating && (!email.trim() || password.length < 6))}>
              {(saving || uploadingAvatar) && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
              {uploadingAvatar ? t('barbers.modal.uploading') : barber ? t('common.save') : t('common.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
