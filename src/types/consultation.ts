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
  created_at: string;
  contacted_at: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
}

export const STATUS_CONFIG: Record<ConsultationStatus, { label: string; color: string; bgColor: string }> = {
  new: { label: 'Nueva', color: 'text-yellow-700', bgColor: 'bg-yellow-100 border-yellow-200' },
  contacted: { label: 'Contactada', color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-200' },
  scheduled: { label: 'Programada', color: 'text-purple-700', bgColor: 'bg-purple-100 border-purple-200' },
  completed: { label: 'Completada', color: 'text-green-700', bgColor: 'bg-green-100 border-green-200' },
  cancelled: { label: 'Cancelada', color: 'text-gray-600', bgColor: 'bg-gray-100 border-gray-200' },
};
