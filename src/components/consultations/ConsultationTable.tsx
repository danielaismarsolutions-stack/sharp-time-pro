import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { StatusDropdown } from './StatusDropdown';
import { Consultation, ConsultationStatus } from '@/types/consultation';
import { format } from 'date-fns';
import { Phone, Mail, MessageCircle, Image, FileText, User, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';

interface ConsultationTableProps {
  consultations: Consultation[];
  onStatusChange: (id: string, status: ConsultationStatus) => Promise<void>;
  onViewPhoto: (consultation: Consultation) => void;
  onAddNotes: (consultation: Consultation) => void;
  onRowClick: (consultation: Consultation) => void;
  onDelete: (consultation: Consultation) => void;
}

export function ConsultationTable({
  consultations,
  onStatusChange,
  onViewPhoto,
  onAddNotes,
  onRowClick,
  onDelete,
}: ConsultationTableProps) {
  const { t, dateLocale } = useTranslation();
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const formatDate = (date: string) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: dateLocale });
  };

  const toggleNotes = (id: string) => {
    setExpandedNotes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">{t('consultations.table.photo')}</TableHead>
            <TableHead>{t('consultations.table.client')}</TableHead>
            <TableHead>{t('consultations.table.service')}</TableHead>
            <TableHead className="hidden lg:table-cell">{t('consultations.table.description')}</TableHead>
            <TableHead>{t('common.date')}</TableHead>
            <TableHead>{t('common.status')}</TableHead>
            <TableHead className="text-right">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {consultations.map((consultation) => {
            const whatsappUrl = `https://wa.me/34${consultation.client_phone.replace(/\D/g, '')}?text=${t('consultations.whatsappMessage', {
              name: encodeURIComponent(consultation.client_name),
              service: encodeURIComponent(consultation.service_name),
            })}`;
            const isExpanded = expandedNotes[consultation.id];
            const hasLongNotes = consultation.client_notes && consultation.client_notes.length > 80;
            const displayNotes = isExpanded
              ? consultation.client_notes
              : consultation.client_notes?.substring(0, 80) + (hasLongNotes ? '...' : '');

            return (
              <TableRow
                key={consultation.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onRowClick(consultation)}
              >
                {/* Photo */}
                <TableCell>
                  {consultation.photo_url ? (
                    <img
                      src={consultation.photo_url}
                      alt={consultation.client_name}
                      className="w-10 h-10 rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>

                {/* Client */}
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium">{consultation.client_name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <a
                        href={`tel:${consultation.client_phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-primary"
                      >
                        {consultation.client_phone}
                      </a>
                    </div>
                    {consultation.client_email && (
                      <a
                        href={`mailto:${consultation.client_email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-muted-foreground hover:text-primary block truncate max-w-[180px]"
                      >
                        {consultation.client_email}
                      </a>
                    )}
                  </div>
                </TableCell>

                {/* Service */}
                <TableCell>{consultation.service_name}</TableCell>

                {/* Description - Hidden on smaller screens */}
                <TableCell className="hidden lg:table-cell max-w-[200px]">
                  {consultation.client_notes ? (
                    <div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {displayNotes}
                      </p>
                      {hasLongNotes && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleNotes(consultation.id);
                          }}
                          className="text-xs text-primary flex items-center gap-1 mt-1"
                        >
                          {isExpanded ? (
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
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>

                {/* Date */}
                <TableCell className="text-sm">
                  {formatDate(consultation.created_at)}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <StatusBadge status={consultation.status} />
                </TableCell>

                {/* Actions */}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </a>

                    <a href={`tel:${consultation.client_phone}`}>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Phone className="h-4 w-4" />
                      </Button>
                    </a>

                    <StatusDropdown
                      currentStatus={consultation.status}
                      onStatusChange={(status) => onStatusChange(consultation.id, status)}
                    />

                    {consultation.photo_url && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => onViewPhoto(consultation)}
                      >
                        <Image className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => onAddNotes(consultation)}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onDelete(consultation)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
