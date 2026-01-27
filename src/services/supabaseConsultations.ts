import { supabase } from '@/lib/supabase';
import { BUSINESS_ID } from '@/config/api';
import type { Consultation, ConsultationStatus } from '@/types/consultation';

export const supabaseConsultationsApi = {
  async getAll(): Promise<Consultation[]> {
    const { data, error } = await supabase
      .from('consultations')
      .select('*')
      .eq('business_id', BUSINESS_ID)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching consultations:', error);
      throw error;
    }

    return data || [];
  },

  async updateStatus(id: string, status: ConsultationStatus): Promise<void> {
    const updateData: Record<string, unknown> = { status };
    
    // Set timestamp based on status (only for columns that exist)
    if (status === 'contacted') {
      updateData.contacted_at = new Date().toISOString();
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }
    // Note: scheduled_at column doesn't exist in the table

    const { error } = await supabase
      .from('consultations')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating consultation status:', error);
      throw error;
    }
  },

  async markAsScheduled(id: string, bookingId?: string): Promise<void> {
    const updateData: Record<string, unknown> = { 
      status: 'scheduled' as ConsultationStatus,
    };
    
    if (bookingId) {
      updateData.booking_id = bookingId;
    }

    const { error } = await supabase
      .from('consultations')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error marking consultation as scheduled:', error);
      throw error;
    }
  },

  async updateStaffNotes(id: string, staffNotes: string): Promise<void> {
    const { error } = await supabase
      .from('consultations')
      .update({ staff_notes: staffNotes })
      .eq('id', id);

    if (error) {
      console.error('Error updating staff notes:', error);
      throw error;
    }
  },

  subscribeToChanges(callback: () => void) {
    return supabase
      .channel('consultations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consultations',
          filter: `business_id=eq.${BUSINESS_ID}`,
        },
        () => {
          callback();
        }
      )
      .subscribe();
  },
};
