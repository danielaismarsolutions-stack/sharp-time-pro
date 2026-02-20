import { eventsStorageApi } from './eventsStorage';
import { setBusinessId, clearBusinessId } from '@/config/session';

describe('eventsStorageApi', () => {
  beforeEach(() => {
    localStorage.clear();
    setBusinessId('test-biz');
  });

  afterEach(() => {
    clearBusinessId();
  });

  const eventData = {
    name: 'Team Standup',
    event_date: '2026-03-15',
    start_time: '09:00',
    end_time: '09:30',
  };

  describe('create', () => {
    it('creates an event and returns it with an ID', async () => {
      const event = await eventsStorageApi.create(eventData);

      expect(event.id).toMatch(/^evt-/);
      expect(event.name).toBe('Team Standup');
      expect(event.event_date).toBe('2026-03-15');
      expect(event.business_id).toBe('test-biz');
    });

    it('normalizes HH:mm times to HH:mm:ss', async () => {
      const event = await eventsStorageApi.create(eventData);

      expect(event.start_time).toBe('09:00:00');
      expect(event.end_time).toBe('09:30:00');
    });

    it('preserves HH:mm:ss times as-is', async () => {
      const event = await eventsStorageApi.create({
        ...eventData,
        start_time: '09:00:00',
        end_time: '09:30:00',
      });

      expect(event.start_time).toBe('09:00:00');
      expect(event.end_time).toBe('09:30:00');
    });

    it('defaults repeat to none', async () => {
      const event = await eventsStorageApi.create(eventData);
      expect(event.repeat).toBe('none');
    });

    it('defaults color to soft grey', async () => {
      const event = await eventsStorageApi.create(eventData);
      expect(event.color).toBe('#d1d5db');
    });

    it('uses provided optional fields', async () => {
      const event = await eventsStorageApi.create({
        ...eventData,
        location: 'Room A',
        notes: 'Bring laptop',
        barber: 'Carlos',
        color: '#ff0000',
      });

      expect(event.location).toBe('Room A');
      expect(event.notes).toBe('Bring laptop');
      expect(event.barber).toBe('Carlos');
      expect(event.color).toBe('#ff0000');
    });
  });

  describe('getAll', () => {
    it('returns empty array when no events exist', async () => {
      const events = await eventsStorageApi.getAll();
      expect(events).toEqual([]);
    });

    it('returns all created events', async () => {
      await eventsStorageApi.create(eventData);
      await eventsStorageApi.create({ ...eventData, name: 'Lunch' });

      const events = await eventsStorageApi.getAll();
      expect(events).toHaveLength(2);
    });
  });

  describe('getById', () => {
    it('returns the event by ID', async () => {
      const created = await eventsStorageApi.create(eventData);
      const found = await eventsStorageApi.getById(created.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    it('returns null for non-existent ID', async () => {
      const found = await eventsStorageApi.getById('evt-nonexistent');
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('updates event fields', async () => {
      const created = await eventsStorageApi.create(eventData);
      const updated = await eventsStorageApi.update(created.id, { name: 'Renamed' });

      expect(updated.name).toBe('Renamed');
      expect(updated.id).toBe(created.id);
    });

    it('throws when updating a non-existent event', async () => {
      await expect(
        eventsStorageApi.update('evt-nonexistent', { name: 'nope' })
      ).rejects.toThrow('Event not found');
    });

    it('normalizes updated times', async () => {
      const created = await eventsStorageApi.create(eventData);
      const updated = await eventsStorageApi.update(created.id, {
        start_time: '14:00',
        end_time: '15:00',
      });

      expect(updated.start_time).toBe('14:00:00');
      expect(updated.end_time).toBe('15:00:00');
    });
  });

  describe('delete', () => {
    it('removes an event', async () => {
      const created = await eventsStorageApi.create(eventData);
      await eventsStorageApi.delete(created.id);

      const found = await eventsStorageApi.getById(created.id);
      expect(found).toBeNull();
    });

    it('does not throw when deleting a non-existent event', async () => {
      await expect(eventsStorageApi.delete('evt-nope')).resolves.not.toThrow();
    });
  });

  describe('getByDateRange', () => {
    it('filters events within the date range', async () => {
      await eventsStorageApi.create({ ...eventData, event_date: '2026-03-10' });
      await eventsStorageApi.create({ ...eventData, event_date: '2026-03-15' });
      await eventsStorageApi.create({ ...eventData, event_date: '2026-03-20' });
      await eventsStorageApi.create({ ...eventData, event_date: '2026-04-01' });

      const result = await eventsStorageApi.getByDateRange('2026-03-10', '2026-03-20');
      expect(result).toHaveLength(3);
    });

    it('returns empty array when no events match', async () => {
      await eventsStorageApi.create({ ...eventData, event_date: '2026-01-01' });

      const result = await eventsStorageApi.getByDateRange('2026-06-01', '2026-06-30');
      expect(result).toHaveLength(0);
    });
  });
});
