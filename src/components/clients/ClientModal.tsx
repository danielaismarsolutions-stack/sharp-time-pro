import { useState, useEffect } from 'react';
import { User, Phone, Mail, MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Client } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/LanguageContext';

interface ClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSave: (client: Partial<Client>) => Promise<void>;
}

export default function ClientModal({
  open,
  onOpenChange,
  client,
  onSave,
}: ClientModalProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
  });

  // Detect virtual keyboard and compute offset to shift dialog up
  useEffect(() => {
    if (!open) {
      setKeyboardOffset(0);
      return;
    }

    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      const offset = window.innerHeight - vv.height;
      setKeyboardOffset(offset > 100 ? offset : 0);
    };

    vv.addEventListener('resize', handleResize);
    vv.addEventListener('scroll', handleResize);
    handleResize();

    return () => {
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleResize);
    };
  }, [open]);

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        phone: client.phone,
        email: client.email,
        notes: client.notes || '',
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        notes: '',
      });
    }
  }, [client, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast({
        title: t('clients.modal.incompleteFieldsTitle'),
        description: t('clients.modal.incompleteFieldsDescription'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await onSave({
        ...client,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        notes: formData.notes,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('clients.modal.saveFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border-border max-h-[85dvh] overflow-y-auto transition-[top] duration-200"
        style={keyboardOffset > 0 ? {
          top: `calc(50% - ${keyboardOffset / 2}px)`,
        } : undefined}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <User className="h-4 w-4 text-primary" />
            {client ? t('clients.modal.editTitle') : t('clients.modal.newTitle')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5 text-xs">
              <User className="h-3 w-3" />
              {t('common.fullName')} *
            </Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('clients.modal.namePlaceholder')}
              className="h-8 min-h-[40px] md:min-h-0 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-1.5 text-xs">
              <Phone className="h-3 w-3" />
              {t('common.phone')} *
            </Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder={t('clients.modal.phonePlaceholder')}
              className="h-8 min-h-[40px] md:min-h-0 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-1.5 text-xs">
              <Mail className="h-3 w-3" />
              {t('clients.modal.emailLabel')}
            </Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={t('clients.modal.emailPlaceholder')}
              className="h-8 min-h-[40px] md:min-h-0 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-1.5 text-xs">
              <MessageSquare className="h-3 w-3" />
              {t('common.notes')}
            </Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t('clients.modal.notesPlaceholder')}
              rows={2}
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" className="text-xs h-8 min-h-[40px] md:min-h-0" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" size="sm" className="text-xs h-8 min-h-[40px] md:min-h-0" disabled={isLoading}>
              {isLoading ? t('common.saving') : client ? t('common.update') : t('clients.modal.createClient')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
