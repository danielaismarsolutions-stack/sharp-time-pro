import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StatusDropdown } from './StatusDropdown';
import { StatusBadge } from './StatusBadge';
import { Consultation, ConsultationStatus } from '@/types/consultation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Phone, Mail, MessageCircle, Calendar, User, FileText, Loader2, ImageIcon } from 'lucide-react';

interface ConsultationDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultation: Consultation;
  onStatusChange: (status: ConsultationStatus) => Promise<void>;
  onNotesChange: (notes: string) => Promise<void>;
  onConvertToBooking?: () => void;
}

export function ConsultationDetailModal({
  open,
  onOpenChange,
  consultation,
  onStatusChange,
  onNotesChange,
  onConvertToBooking,
}: ConsultationDetailModalProps) {
  const [notes, setNotes] = useState(consultation.staff_notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleStatusChange = async (status: ConsultationStatus) => {
    setUpdatingStatus(true);
    try {
      await onStatusChange(status);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await onNotesChange(notes);
    } finally {
      setSavingNotes(false);
    }
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: es });
  };

  const canConvertToBooking = consultation.status === 'new' || consultation.status === 'contacted' || consultation.status === 'scheduled';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span>Detalle de Consulta</span>
            <StatusBadge status={consultation.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Photo */}
          {consultation.photo_url ? (
            <div className="rounded-lg overflow-hidden border">
              <img
                src={consultation.photo_url}
                alt={`Foto de ${consultation.client_name}`}
                className="w-full h-64 object-cover"
              />
            </div>
          ) : (
            <div className="h-48 bg-muted rounded-lg flex items-center justify-center border">
              <div className="text-center text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Sin foto adjunta</p>
              </div>
            </div>
          )}

          {/* Client Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{consultation.client_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${consultation.client_phone}`} className="text-primary hover:underline">
                  {consultation.client_phone}
                </a>
              </div>
              {consultation.client_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${consultation.client_email}`} className="text-primary hover:underline">
                    {consultation.client_email}
                  </a>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <span>{consultation.service_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(consultation.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Client Notes */}
          {consultation.client_notes && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Descripción del cliente
              </Label>
              <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                {consultation.client_notes}
              </div>
            </div>
          )}

          {/* Staff Notes */}
          <div className="space-y-2">
            <Label htmlFor="detail-notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notas del staff
            </Label>
            <Textarea
              id="detail-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Añade notas internas sobre esta consulta..."
              rows={3}
            />
            <Button
              size="sm"
              onClick={handleSaveNotes}
              disabled={savingNotes || notes === (consultation.staff_notes || '')}
            >
              {savingNotes && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar notas
            </Button>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
            <StatusDropdown
              currentStatus={consultation.status}
              onStatusChange={handleStatusChange}
              disabled={updatingStatus}
            />

            {canConvertToBooking && onConvertToBooking && (
              <Button onClick={onConvertToBooking}>
                Convertir a reserva
              </Button>
            )}

            <a
              href={`https://wa.me/34${consultation.client_phone.replace(/\D/g, '')}?text=Hola ${consultation.client_name}, te contactamos desde Rioja Barber Studio sobre tu consulta de ${consultation.service_name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Button variant="outline" className="gap-2 text-green-600 hover:text-green-700">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
            </a>

            <a href={`tel:${consultation.client_phone}`}>
              <Button variant="outline" className="gap-2">
                <Phone className="h-4 w-4" />
                Llamar
              </Button>
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
