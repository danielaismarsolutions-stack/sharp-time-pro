import { Booking, Client, Service, BusinessSettings, BusinessHours, BookingSettings, NotificationSettings, AnalyticsData } from '@/types';
import { format, subDays, addDays, subMonths } from 'date-fns';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 11);

// Services
export const mockServices: Service[] = [
  { id: 's1', name: 'Classic Haircut', description: 'Traditional haircut with clippers and scissors', duration: 30, price: 25, color: '#3b82f6', isActive: true, bufferBefore: 0, bufferAfter: 5 },
  { id: 's2', name: 'Beard Trim', description: 'Shape and trim beard to desired style', duration: 20, price: 15, color: '#10b981', isActive: true, bufferBefore: 0, bufferAfter: 5 },
  { id: 's3', name: 'Haircut & Beard', description: 'Complete grooming package', duration: 45, price: 35, color: '#8b5cf6', isActive: true, bufferBefore: 0, bufferAfter: 5 },
  { id: 's4', name: 'Hot Towel Shave', description: 'Luxurious traditional straight razor shave', duration: 30, price: 30, color: '#f59e0b', isActive: true, bufferBefore: 0, bufferAfter: 5 },
  { id: 's5', name: 'Kids Haircut', description: 'Haircut for children under 12', duration: 20, price: 18, color: '#ec4899', isActive: true, bufferBefore: 0, bufferAfter: 5 },
  { id: 's6', name: 'Senior Haircut', description: 'Haircut for seniors 65+', duration: 25, price: 20, color: '#6366f1', isActive: true, bufferBefore: 0, bufferAfter: 5 },
  { id: 's7', name: 'Hair & Scalp Treatment', description: 'Deep conditioning and massage', duration: 40, price: 40, color: '#14b8a6', isActive: true, bufferBefore: 0, bufferAfter: 5 },
  { id: 's8', name: 'Hair Coloring', description: 'Full hair color service', duration: 60, price: 55, color: '#f97316', isActive: false, bufferBefore: 0, bufferAfter: 10 },
];

// Clients with realistic data
export const mockClients: Client[] = [
  { id: 'c1', name: 'Carlos García', phone: '+34 612 345 678', email: 'carlos.garcia@email.com', notes: 'Prefers short fade on sides', totalVisits: 24, totalSpent: 720, lastVisit: format(subDays(new Date(), 14), 'yyyy-MM-dd'), createdAt: format(subMonths(new Date(), 18), 'yyyy-MM-dd'), tags: ['regular', 'vip'] },
  { id: 'c2', name: 'Miguel Rodríguez', phone: '+34 623 456 789', email: 'miguel.r@email.com', notes: 'Sensitive scalp, use gentle products', totalVisits: 12, totalSpent: 420, lastVisit: format(subDays(new Date(), 7), 'yyyy-MM-dd'), createdAt: format(subMonths(new Date(), 8), 'yyyy-MM-dd'), tags: ['regular'] },
  { id: 'c3', name: 'Antonio López', phone: '+34 634 567 890', email: 'antonio.lopez@email.com', notes: '', totalVisits: 6, totalSpent: 150, lastVisit: format(subDays(new Date(), 21), 'yyyy-MM-dd'), createdAt: format(subMonths(new Date(), 4), 'yyyy-MM-dd'), tags: [] },
  { id: 'c4', name: 'David Martínez', phone: '+34 645 678 901', email: 'david.m@email.com', notes: 'Always wants beard oil after trim', totalVisits: 18, totalSpent: 630, lastVisit: format(subDays(new Date(), 3), 'yyyy-MM-dd'), createdAt: format(subMonths(new Date(), 12), 'yyyy-MM-dd'), tags: ['regular', 'beard'] },
  { id: 'c5', name: 'Javier Hernández', phone: '+34 656 789 012', email: 'javier.h@email.com', notes: '', totalVisits: 3, totalSpent: 75, lastVisit: format(subDays(new Date(), 45), 'yyyy-MM-dd'), createdAt: format(subMonths(new Date(), 2), 'yyyy-MM-dd'), tags: ['new'] },
  { id: 'c6', name: 'Pablo Sánchez', phone: '+34 667 890 123', email: 'pablo.sanchez@email.com', notes: 'Prefers appointments after 5pm', totalVisits: 15, totalSpent: 525, lastVisit: format(subDays(new Date(), 10), 'yyyy-MM-dd'), createdAt: format(subMonths(new Date(), 10), 'yyyy-MM-dd'), tags: ['regular'] },
  { id: 'c7', name: 'Alejandro Díaz', phone: '+34 678 901 234', email: 'alejandro.d@email.com', notes: 'Son Lucas also comes (kids cut)', totalVisits: 8, totalSpent: 280, lastVisit: format(subDays(new Date(), 5), 'yyyy-MM-dd'), createdAt: format(subMonths(new Date(), 6), 'yyyy-MM-dd'), tags: ['family'] },
  { id: 'c8', name: 'Fernando Torres', phone: '+34 689 012 345', email: 'fernando.t@email.com', notes: '', totalVisits: 2, totalSpent: 50, lastVisit: format(subDays(new Date(), 60), 'yyyy-MM-dd'), createdAt: format(subMonths(new Date(), 3), 'yyyy-MM-dd'), tags: ['new'] },
  { id: 'c9', name: 'Roberto Ruiz', phone: '+34 690 123 456', email: 'roberto.ruiz@email.com', notes: 'VIP - always offer coffee', totalVisits: 30, totalSpent: 1050, lastVisit: format(subDays(new Date(), 1), 'yyyy-MM-dd'), createdAt: format(subMonths(new Date(), 24), 'yyyy-MM-dd'), tags: ['vip', 'regular'] },
  { id: 'c10', name: 'Manuel Jiménez', phone: '+34 601 234 567', email: 'manuel.j@email.com', notes: '', totalVisits: 5, totalSpent: 175, lastVisit: format(subDays(new Date(), 28), 'yyyy-MM-dd'), createdAt: format(subMonths(new Date(), 5), 'yyyy-MM-dd'), tags: [] },
];

// Generate bookings for past and future
const generateBookings = (): Booking[] => {
  const bookings: Booking[] = [];
  const statuses: Booking['status'][] = ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'];
  const sources: Booking['source'][] = ['online', 'phone', 'walk-in'];
  const times = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'];

  // Past bookings (last 30 days) - mostly completed
  for (let i = 30; i >= 1; i--) {
    const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
    const numBookings = Math.floor(Math.random() * 6) + 3; // 3-8 bookings per day
    
    for (let j = 0; j < numBookings; j++) {
      const client = mockClients[Math.floor(Math.random() * mockClients.length)];
      const service = mockServices.filter(s => s.isActive)[Math.floor(Math.random() * mockServices.filter(s => s.isActive).length)];
      const status = Math.random() > 0.15 ? 'completed' : (Math.random() > 0.5 ? 'cancelled' : 'no-show');
      
      bookings.push({
        id: generateId(),
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        clientEmail: client.email,
        serviceId: service.id,
        serviceName: service.name,
        serviceDuration: service.duration,
        servicePrice: service.price,
        date,
        time: times[Math.floor(Math.random() * times.length)],
        status,
        source: sources[Math.floor(Math.random() * sources.length)],
        notes: Math.random() > 0.7 ? 'Customer requested specific style' : '',
        createdAt: format(subDays(new Date(), i + Math.floor(Math.random() * 5)), 'yyyy-MM-dd'),
      });
    }
  }

  // Today's bookings
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayTimes = ['09:00', '09:30', '10:00', '11:00', '11:30', '14:00', '15:00', '16:00', '17:00', '18:00'];
  const currentHour = new Date().getHours();
  
  todayTimes.forEach((time, index) => {
    const client = mockClients[index % mockClients.length];
    const service = mockServices.filter(s => s.isActive)[index % mockServices.filter(s => s.isActive).length];
    const bookingHour = parseInt(time.split(':')[0]);
    
    let status: Booking['status'] = 'confirmed';
    if (bookingHour < currentHour) {
      status = Math.random() > 0.1 ? 'completed' : 'no-show';
    } else if (bookingHour === currentHour) {
      status = 'confirmed';
    } else {
      status = Math.random() > 0.2 ? 'confirmed' : 'pending';
    }

    bookings.push({
      id: generateId(),
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      clientEmail: client.email,
      serviceId: service.id,
      serviceName: service.name,
      serviceDuration: service.duration,
      servicePrice: service.price,
      date: today,
      time,
      status,
      source: sources[Math.floor(Math.random() * sources.length)],
      notes: '',
      createdAt: format(subDays(new Date(), Math.floor(Math.random() * 7)), 'yyyy-MM-dd'),
    });
  });

  // Future bookings (next 14 days)
  for (let i = 1; i <= 14; i++) {
    const date = format(addDays(new Date(), i), 'yyyy-MM-dd');
    const numBookings = Math.floor(Math.random() * 5) + 2;
    
    for (let j = 0; j < numBookings; j++) {
      const client = mockClients[Math.floor(Math.random() * mockClients.length)];
      const service = mockServices.filter(s => s.isActive)[Math.floor(Math.random() * mockServices.filter(s => s.isActive).length)];
      
      bookings.push({
        id: generateId(),
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        clientEmail: client.email,
        serviceId: service.id,
        serviceName: service.name,
        serviceDuration: service.duration,
        servicePrice: service.price,
        date,
        time: times[Math.floor(Math.random() * times.length)],
        status: Math.random() > 0.3 ? 'confirmed' : 'pending',
        source: sources[Math.floor(Math.random() * sources.length)],
        notes: '',
        createdAt: format(subDays(new Date(), Math.floor(Math.random() * 3)), 'yyyy-MM-dd'),
      });
    }
  }

  return bookings.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });
};

export const mockBookings: Booking[] = generateBookings();

// Business Settings
export const mockBusinessSettings: BusinessSettings = {
  businessName: 'The Gentleman\'s Cut',
  address: 'Calle Mayor 123, 28013 Madrid, Spain',
  phone: '+34 912 345 678',
  email: 'info@gentlemanscut.es',
  description: 'Premium barbershop offering classic and modern grooming services since 2015.',
};

export const mockBusinessHours: BusinessHours = {
  monday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
  tuesday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
  wednesday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
  thursday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
  friday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
  saturday: { isOpen: true, openTime: '10:00', closeTime: '18:00' },
  sunday: { isOpen: false, openTime: '10:00', closeTime: '14:00' },
};

export const mockBookingSettings: BookingSettings = {
  minAdvanceBooking: 2,
  maxAdvanceBooking: 30,
  onlineBookingEnabled: true,
  cancellationPolicy: 'Cancellations must be made at least 24 hours in advance. Late cancellations may be subject to a fee.',
};

export const mockNotificationSettings: NotificationSettings = {
  emailNewBooking: true,
  emailCancellation: true,
  emailReminder: true,
  reminderTiming: 24,
  smsEnabled: false,
};

// Analytics data
export const mockAnalytics: AnalyticsData = {
  revenue: {
    today: mockBookings.filter(b => b.date === format(new Date(), 'yyyy-MM-dd') && b.status === 'completed').reduce((sum, b) => sum + b.servicePrice, 0),
    thisWeek: 1250,
    thisMonth: 4850,
    thisYear: 52400,
    byService: [
      { name: 'Classic Haircut', revenue: 18500 },
      { name: 'Haircut & Beard', revenue: 14700 },
      { name: 'Beard Trim', revenue: 8200 },
      { name: 'Hot Towel Shave', revenue: 6400 },
      { name: 'Kids Haircut', revenue: 2800 },
      { name: 'Senior Haircut', revenue: 1800 },
    ],
    trend: Array.from({ length: 30 }, (_, i) => ({
      date: format(subDays(new Date(), 29 - i), 'yyyy-MM-dd'),
      revenue: Math.floor(Math.random() * 200) + 150,
    })),
  },
  bookings: {
    total: mockBookings.length,
    completed: mockBookings.filter(b => b.status === 'completed').length,
    cancelled: mockBookings.filter(b => b.status === 'cancelled').length,
    noShow: mockBookings.filter(b => b.status === 'no-show').length,
    completionRate: 87,
    busiestHours: [
      { hour: 9, count: 45 },
      { hour: 10, count: 62 },
      { hour: 11, count: 58 },
      { hour: 12, count: 35 },
      { hour: 14, count: 48 },
      { hour: 15, count: 55 },
      { hour: 16, count: 68 },
      { hour: 17, count: 72 },
      { hour: 18, count: 65 },
      { hour: 19, count: 42 },
    ],
    busiestDays: [
      { day: 'Monday', count: 85 },
      { day: 'Tuesday', count: 72 },
      { day: 'Wednesday', count: 78 },
      { day: 'Thursday', count: 82 },
      { day: 'Friday', count: 95 },
      { day: 'Saturday', count: 110 },
      { day: 'Sunday', count: 0 },
    ],
  },
  clients: {
    total: mockClients.length,
    newThisMonth: 3,
    returning: 7,
    topClients: mockClients
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5)
      .map(c => ({ id: c.id, name: c.name, revenue: c.totalSpent, visits: c.totalVisits })),
    retentionRate: 78,
  },
};
