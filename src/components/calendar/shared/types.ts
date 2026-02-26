// Shared types for calendar components
import { ApiBooking } from '@/types/api';
import { Service } from '@/types';

export interface BookingCardData {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  client_name: string;
  client_phone?: string;
  service_name: string;
  service_price: number;
  barber?: string | null;
  status: string;
}

export interface OverlapInfo {
  total: number;
  index: number;
}

export interface ColorClasses {
  bg: string;
  hover: string;
  text: string;
  border: string;
}

export interface DragEndResult {
  bookingId: string;
  newDate: string;
  newStartTime: string;
  newEndTime: string;
}

export interface EventDragEndResult {
  eventId: string;
  newDate: string;
  newStartTime: string;
  newEndTime: string;
}

export interface CalendarCardProps {
  booking: ApiBooking;
  style: { top: number; height: number };
  colorClasses: ColorClasses;
  overlapInfo: OverlapInfo;
  onClick: () => void;
  isDragging?: boolean;
  isCompact?: boolean;
}
