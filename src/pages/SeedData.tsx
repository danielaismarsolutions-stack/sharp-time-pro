import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

const BUSINESS_ID = '11111111-1111-1111-1111-111111111111';

const SERVICES = [
  { id: '62ff9466-6e7d-4b88-98d3-a8f92f9a3785', name: 'Corte clásico', duration: 30, price: 15 },
  { id: '785dc827-5d38-4cd3-9842-b84108c8b313', name: 'Corte niño', duration: 30, price: 12 },
  { id: '4c0bb9ce-bfa9-4974-affe-7449f1ec8f76', name: 'Arreglo de barba', duration: 15, price: 10 },
  { id: 'a0ee61c2-65b9-4ce7-baaa-526813e9840b', name: 'Corte + barba', duration: 45, price: 21 },
  { id: '120dec10-834e-428c-8d65-8d3cb49ca998', name: 'Rapar + arreglo de barba', duration: 25, price: 17 },
  { id: '54b34533-d6d9-46c7-9b9f-7acd4bc694b3', name: 'Corte degradado', duration: 40, price: 15 },
];

const BARBERS = [
  { id: 'b6c5f718-8e1a-471d-9283-2b89a89269c4', name: 'Badr' },
  { id: 'e1efe1ca-8d28-4102-895e-fbfb97e155a4', name: 'Francis' },
  { id: '9b221566-db0f-4af3-b872-ab34d7f57d64', name: 'Ivancito' },
  { id: '396f7732-ff37-4be6-9154-f6cd4f43a6a4', name: 'Mercado' },
  { id: 'cd16e54c-57ef-4ffd-be5e-51bc7ef22c2e', name: 'Rioja' },
];

const CLIENT_NAMES = [
  { name: 'Carlos García', phone: '+34612345001', email: 'carlos.garcia@email.com' },
  { name: 'Miguel Fernández', phone: '+34612345002', email: 'miguel.f@email.com' },
  { name: 'Alejandro López', phone: '+34612345003', email: 'alex.lopez@email.com' },
  { name: 'Javier Martín', phone: '+34612345004', email: 'javi.martin@email.com' },
  { name: 'Pablo Sánchez', phone: '+34612345005', email: 'pablo.s@email.com' },
  { name: 'Adrián Ruiz', phone: '+34612345006', email: 'adrian.ruiz@email.com' },
  { name: 'Hugo Díaz', phone: '+34612345007', email: 'hugo.diaz@email.com' },
  { name: 'Álvaro Moreno', phone: '+34612345008', email: 'alvaro.m@email.com' },
  { name: 'Sergio Jiménez', phone: '+34612345009', email: 'sergio.j@email.com' },
  { name: 'Marcos Romero', phone: '+34612345010', email: 'marcos.r@email.com' },
  { name: 'Raúl Navarro', phone: '+34612345011', email: 'raul.n@email.com' },
  { name: 'Iker Torres', phone: '+34612345012', email: 'iker.t@email.com' },
  { name: 'David Domínguez', phone: '+34612345013', email: 'david.d@email.com' },
  { name: 'Rubén Vázquez', phone: '+34612345014', email: 'ruben.v@email.com' },
  { name: 'Antonio Gil', phone: '+34612345015', email: 'antonio.g@email.com' },
  { name: 'Fernando Molina', phone: '+34612345016', email: 'fernando.m@email.com' },
  { name: 'Luis Ortega', phone: '+34612345017', email: 'luis.o@email.com' },
  { name: 'Manuel Castillo', phone: '+34612345018', email: 'manuel.c@email.com' },
  { name: 'Óscar Delgado', phone: '+34612345019', email: 'oscar.d@email.com' },
  { name: 'Roberto Santos', phone: '+34612345020', email: 'roberto.s@email.com' },
  { name: 'Enrique Ramos', phone: '+34612345021', email: 'enrique.r@email.com' },
  { name: 'Iván Suárez', phone: '+34612345022', email: 'ivan.s@email.com' },
  { name: 'Tomás Méndez', phone: '+34612345023', email: 'tomas.m@email.com' },
  { name: 'Víctor Herrera', phone: '+34612345024', email: 'victor.h@email.com' },
  { name: 'Andrés Peña', phone: '+34612345025', email: 'andres.p@email.com' },
];

const SOURCES: Array<'online' | 'phone' | 'walk_in'> = ['online', 'phone', 'walk_in', 'phone', 'online'];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}:00`;
}

// Generate bookings for a single day
function generateDayBookings(
  dateStr: string,
  clientIds: Array<{ id: string; name: string; phone: string; email: string }>,
  dayOfWeek: number
): Array<Record<string, unknown>> {
  if (dayOfWeek === 0) return []; // Sunday closed

  const bookings: Array<Record<string, unknown>> = [];
  const isSaturday = dayOfWeek === 6;
  const slots = isSaturday
    ? ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00']
    : ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'];

  // Each barber gets some bookings per day (2-5 per barber)
  for (const barber of BARBERS) {
    const numBookings = Math.floor(Math.random() * 4) + 2; // 2-5
    const usedSlots = new Set<string>();

    for (let i = 0; i < numBookings; i++) {
      // Pick a random unused slot
      const availableSlots = slots.filter(s => !usedSlots.has(s));
      if (availableSlots.length === 0) break;

      const slot = randomPick(availableSlots);
      usedSlots.add(slot);

      const service = randomPick(SERVICES);
      const client = randomPick(clientIds);
      const startTime = `${slot}:00`;
      const endTime = addMinutes(slot, service.duration);

      // Past dates: mostly completed, some cancelled/no_show
      const today = new Date();
      const bookingDate = new Date(dateStr);
      let status: string;
      if (bookingDate < today) {
        const rand = Math.random();
        if (rand < 0.75) status = 'completed';
        else if (rand < 0.88) status = 'confirmed';
        else if (rand < 0.95) status = 'cancelled';
        else status = 'no_show';
      } else {
        status = Math.random() < 0.8 ? 'confirmed' : 'pending';
      }

      bookings.push({
        business_id: BUSINESS_ID,
        client_id: client.id,
        service_id: service.id,
        user_id: barber.id,
        booking_date: dateStr,
        start_time: startTime,
        end_time: endTime,
        status,
        source: randomPick(SOURCES),
        client_name: client.name,
        client_phone: client.phone,
        client_email: client.email,
        service_name: service.name,
        service_duration: service.duration,
        service_price: service.price,
        barber: barber.name,
        booking_type: 'booking',
        notes: null,
      });
    }
  }

  return bookings;
}

export default function SeedData() {
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const appendLog = (msg: string) => setLog(prev => [...prev, msg]);

  const runSeed = async () => {
    setRunning(true);
    setLog([]);

    try {
      // Step 1: Create clients
      appendLog('📋 Creando clientes...');
      const clientPayloads = CLIENT_NAMES.map(c => ({
        business_id: BUSINESS_ID,
        name: c.name,
        phone: c.phone,
        email: c.email,
        total_visits: 0,
        total_spent: 0,
      }));

      const { data: createdClients, error: clientError } = await supabase
        .from('clients')
        .insert(clientPayloads)
        .select('id, name, phone, email');

      if (clientError) {
        appendLog(`❌ Error creando clientes: ${clientError.message}`);
        setRunning(false);
        return;
      }

      const clientIds = (createdClients || []).map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        email: c.email || '',
      }));
      appendLog(`✅ ${clientIds.length} clientes creados`);

      // Step 2: Generate bookings from Jan 1 to Apr 30 2026
      appendLog('📅 Generando citas de enero a abril 2026...');
      const allBookings: Array<Record<string, unknown>> = [];
      const startDate = new Date(2026, 0, 1); // Jan 1
      const endDate = new Date(2026, 3, 30); // Apr 30

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayOfWeek = d.getDay();
        const dayBookings = generateDayBookings(dateStr, clientIds, dayOfWeek);
        allBookings.push(...dayBookings);
      }

      appendLog(`📊 Total citas generadas: ${allBookings.length}`);

      // Step 3: Insert bookings in batches of 100
      const batchSize = 100;
      let inserted = 0;
      for (let i = 0; i < allBookings.length; i += batchSize) {
        const batch = allBookings.slice(i, i + batchSize);
        const { error: bookingError } = await supabase
          .from('bookings')
          .insert(batch);

        if (bookingError) {
          appendLog(`❌ Error en batch ${Math.floor(i / batchSize) + 1}: ${bookingError.message}`);
          // Continue with next batch
        } else {
          inserted += batch.length;
          appendLog(`✅ Batch ${Math.floor(i / batchSize) + 1}: ${inserted}/${allBookings.length} insertados`);
        }
      }

      // Step 4: Update client stats
      appendLog('📈 Actualizando estadísticas de clientes...');
      for (const client of clientIds) {
        const clientBookings = allBookings.filter(
          b => b.client_id === client.id && b.status === 'completed'
        );
        const totalVisits = clientBookings.length;
        const totalSpent = clientBookings.reduce((sum, b) => sum + (b.service_price as number), 0);
        const lastVisit = clientBookings
          .map(b => b.booking_date as string)
          .sort()
          .reverse()[0] || null;

        await supabase
          .from('clients')
          .update({
            total_visits: totalVisits,
            total_spent: totalSpent,
            last_visit_at: lastVisit,
          })
          .eq('id', client.id);
      }

      appendLog('🎉 ¡Seed completado! Recarga la app para ver los datos.');
    } catch (err: unknown) {
      appendLog(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    }

    setRunning(false);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Seed de Datos de Prueba</h1>
      <p className="text-muted-foreground">
        Esto creará ~25 clientes y ~1500+ citas distribuidas de enero a abril 2026 con estados realistas.
      </p>
      <Button onClick={runSeed} disabled={running} size="lg">
        {running ? 'Insertando datos...' : '🚀 Ejecutar Seed'}
      </Button>
      {log.length > 0 && (
        <div className="bg-muted rounded-lg p-4 space-y-1 max-h-96 overflow-y-auto text-sm font-mono">
          {log.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}
