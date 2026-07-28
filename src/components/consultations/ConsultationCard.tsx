import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { StatusDropdown } from './StatusDropdown';
import { Consultation, ConsultationStatus } from '@/types/consultation';
import { format } from 'date-fns';
import { Phone, Mail, MessageCircle, Image, FileText, ChevronDown, ChevronUp, User, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';

interface ConsultationCardProps {
  consultation: Consultation;
  onStatusChange: (status: ConsultationStatus) => Promise<void>;
  onViewPhoto: () => void;
  onAddNotes: () => void;
  onClick: () => void;
  onDelete: () => void;
}

export function ConsultationCard({
  consultation,
  onStatusChange,
  onViewPhoto,
  onAddNotes,
  onClick,
  onDelete,
}: ConsultationCardProps) {
  const { t, dateLocale } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const formatDate = (date: string) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: dateLocale });
  };

  const truncatedNotes = consultation.client_notes && consultation.client_notes.length > 100
    ? consultation.client_notes.substring(0, 100) + '...'
    : consultation.client_notes;

  const whatsappUrl = `https://wa.me/34${consultation.client_phone.replace(/\D/g, '')}?text=${t('consultations.whatsappMessage', {
    name: encodeURIComponent(consultation.client_name),
    service: encodeURIComponent(consultation.service_name),
  })}`;

  return (
    <Card className="overflow-hidden hover:border-primary/50 transition-colors">
      <CardContent className="p-0">
        {/* Header - Clickable */}
        <div 
          className="p-4 cursor-pointer"
          onClick={onClick}
        >
          <div className="flex gap-3">
            {/* Photo or Placeholder */}
            <div className="shrink-0">
              {consultation.photo_url ? (
                <img
                  src={consultation.photo_url}
                  alt={consultation.client_name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium truncate">{consultation.client_name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{consultation.service_name}</p>
                </div>
                <StatusBadge status={consultation.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(consultation.created_at)}
              </p>
            </div>
          </div>

          {/* Description */}
          {consultation.client_notes && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-sm text-muted-foreground">
                {expanded ? consultation.client_notes : truncatedNotes}
              </p>
              {consultation.client_notes.length > 100 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(!expanded);
                  }}
                  className="text-xs text-primary flex items-center gap-1 mt-1"
                >
                  {expanded ? (
                    <>
                      {t('consultations.actions.seeLess')} <ChevronUp className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      {t('common.seeMore')} <ChevronDown className="h-3 w-3" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 flex flex-wrap gap-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <Button size="sm" variant="outline" className="gap-1.5 text-green-600 hover:text-green-700 h-10 min-w-[40px]">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
          </a>

          <a href={`tel:${consultation.client_phone}`} onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="outline" className="gap-1.5 h-10 min-w-[40px]">
              <Phone className="h-4 w-4" />
              {t('consultations.actions.call')}
            </Button>
          </a>

          <div onClick={(e) => e.stopPropagation()}>
            <StatusDropdown
              currentStatus={consultation.status}
              onStatusChange={onStatusChange}
            />
          </div>

          {consultation.photo_url && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-10 min-w-[40px]"
              onClick={(e) => {
                e.stopPropagation();
                onViewPhoto();
              }}
            >
              <Image className="h-4 w-4" />
              {t('consultations.actions.photo')}
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-10 min-w-[40px]"
            onClick={(e) => {
              e.stopPropagation();
              onAddNotes();
            }}
          >
            <FileText className="h-4 w-4" />
            {t('common.notes')}
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-10 min-w-[40px] text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
