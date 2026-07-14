import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/LanguageContext';

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { updatePassword } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const resetForm = () => {
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast({
        title: t('auth.requiredFieldsTitle'),
        description: t('auth.requiredFieldsDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: t('auth.passwordTooShortTitle'),
        description: t('auth.passwordTooShortDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: t('auth.passwordMismatchTitle'),
        description: t('auth.passwordMismatchDesc'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await updatePassword(password);
      toast({
        title: t('auth.passwordUpdatedTitle'),
        description: t('auth.passwordUpdatedDesc'),
      });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.passwordUpdateError');
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) resetForm(); onOpenChange(value); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('auth.changePasswordTitle')}</DialogTitle>
          <DialogDescription>
            {t('auth.changePasswordDesc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">{t('auth.newPassword')}</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">{t('auth.confirmPassword')}</Label>
            <Input
              id="confirm-new-password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="h-11"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { resetForm(); onOpenChange(false); }}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.updatingPassword')}
                </>
              ) : (
                t('auth.updatePassword')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
