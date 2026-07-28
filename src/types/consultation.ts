import type { TranslationKey } from '@/i18n';

export type ConsultationStatus = 'new' | 'contacted' | 'scheduled' | 'completed' | 'cancelled';

export interface Consultation {
  id: string;
  business_id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  service_name: string;
  client_notes: string | null;
  photo_url: string | null;
  status: ConsultationStatus;
  staff_notes: string | null;
  booking_id: string | null;
  created_at: string;
  contacted_at: string | null;
  completed_at: string | null;
}

export const STATUS_CONFIG: Record<ConsultationStatus, { labelKey: TranslationKey; color: string; bgColor: string }> = {
  new: { labelKey: 'consultations.status.new', color: 'text-yellow-700', bgColor: 'bg-yellow-100 border-yellow-200' },
  contacted: { labelKey: 'consultations.status.contacted', color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-200' },
  scheduled: { labelKey: 'consultations.status.scheduled', color: 'text-purple-700', bgColor: 'bg-purple-100 border-purple-200' },
  completed: { labelKey: 'consultations.status.completed', color: 'text-green-700', bgColor: 'bg-green-100 border-green-200' },
  cancelled: { labelKey: 'consultations.status.cancelled', color: 'text-gray-600', bgColor: 'bg-gray-100 border-gray-200' },
};
