// Supabase Holidays / Closure Dates service
// Manages specific dates when the business is closed (holidays or custom closures).
// All queries are scoped to the current business; RLS enforces this at the DB level.
import { SUPABASE_CONFIG } from '@/config/api';
import { getAuthHeaders } from '@/lib/supabase';
import { getBusinessId } from '@/config/session';
import { ClosureDate, ClosureDateInput } from '@/types';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_NAME_LENGTH = 120;

const supabaseHeaders = async () => ({
  ...(await getAuthHeaders()),
  'Prefer': 'return=representation',
});

// Database row shape for the holidays table
export interface DbHoliday {
  id: string;
  business_id: string;
  holiday_date: string; // YYYY-MM-DD
  name: string | null;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
}

const mapDbToClosureDate = (row: DbHoliday): ClosureDate => ({
  id: row.id,
  date: row.holiday_date,
  name: row.name,
  isClosed: row.is_closed,
});

const parseErrorMessage = async (response: Response): Promise<string> => {
  try {
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      return json.message || json.error || text;
    } catch {
      return text;
    }
  } catch {
    return 'Unknown error occurred';
  }
};

const sanitizeName = (name: string | null | undefined): string | null => {
  if (name == null) return null;
  const trimmed = String(name).trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, MAX_NAME_LENGTH);
};

const validateDate = (date: string): void => {
  if (!ISO_DATE_RE.test(date)) {
    throw new Error(`Fecha inválida: "${date}". Usa el formato YYYY-MM-DD.`);
  }
  const d = new Date(date + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Fecha inválida: "${date}".`);
  }
};

export const supabaseHolidaysApi = {
  /** Fetch all closure dates for the current business, ordered by date ascending */
  async getAll(): Promise<ClosureDate[]> {
    const businessId = getBusinessId();
    const response = await fetch(
      `${SUPABASE_CONFIG.url}/rest/v1/holidays?business_id=eq.${businessId}&order=holiday_date.asc`,
      {
        method: 'GET',
        headers: await supabaseHeaders(),
      }
    );

    if (!response.ok) {
      const error = await parseErrorMessage(response);
      throw new Error(`No se pudieron cargar las fechas de cierre: ${error}`);
    }

    const rows: DbHoliday[] = await response.json();
    return rows.map(mapDbToClosureDate);
  },

  /** Insert a new closure date for the current business */
  async add(input: ClosureDateInput): Promise<ClosureDate> {
    validateDate(input.date);
    const businessId = getBusinessId();

    const payload = {
      business_id: businessId,
      holiday_date: input.date,
      name: sanitizeName(input.name),
      is_closed: input.isClosed ?? true,
    };

    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/holidays`, {
      method: 'POST',
      headers: await supabaseHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await parseErrorMessage(response);
      // Unique violation (business_id, holiday_date)
      if (response.status === 409 || /duplicate key/i.test(error)) {
        throw new Error('Ya existe una fecha de cierre para ese día.');
      }
      throw new Error(`No se pudo crear la fecha de cierre: ${error}`);
    }

    const rows: DbHoliday[] = await response.json();
    if (!rows || rows.length === 0) {
      throw new Error('La base de datos no devolvió la fila creada.');
    }
    return mapDbToClosureDate(rows[0]);
  },

  /** Update an existing closure date. Scoped by id + business_id (RLS also enforces this). */
  async update(id: string, input: Partial<ClosureDateInput>): Promise<ClosureDate> {
    if (!id) throw new Error('ID de fecha de cierre requerido.');
    const businessId = getBusinessId();

    const patch: Partial<DbHoliday> = {};
    if (input.date !== undefined) {
      validateDate(input.date);
      patch.holiday_date = input.date;
    }
    if (input.name !== undefined) patch.name = sanitizeName(input.name);
    if (input.isClosed !== undefined) patch.is_closed = input.isClosed;

    if (Object.keys(patch).length === 0) {
      throw new Error('No hay cambios para guardar.');
    }

    const response = await fetch(
      `${SUPABASE_CONFIG.url}/rest/v1/holidays?id=eq.${id}&business_id=eq.${businessId}`,
      {
        method: 'PATCH',
        headers: await supabaseHeaders(),
        body: JSON.stringify(patch),
      }
    );

    if (!response.ok) {
      const error = await parseErrorMessage(response);
      if (response.status === 409 || /duplicate key/i.test(error)) {
        throw new Error('Ya existe una fecha de cierre para ese día.');
      }
      throw new Error(`No se pudo actualizar la fecha de cierre: ${error}`);
    }

    const rows: DbHoliday[] = await response.json();
    if (!rows || rows.length === 0) {
      throw new Error('La fecha de cierre no existe o no pertenece a este negocio.');
    }
    return mapDbToClosureDate(rows[0]);
  },

  /** Remove a closure date. Scoped by id + business_id (RLS also enforces this). */
  async remove(id: string): Promise<void> {
    if (!id) throw new Error('ID de fecha de cierre requerido.');
    const businessId = getBusinessId();

    const response = await fetch(
      `${SUPABASE_CONFIG.url}/rest/v1/holidays?id=eq.${id}&business_id=eq.${businessId}`,
      {
        method: 'DELETE',
        headers: await supabaseHeaders(),
      }
    );

    if (!response.ok) {
      const error = await parseErrorMessage(response);
      throw new Error(`No se pudo eliminar la fecha de cierre: ${error}`);
    }
  },
};

export default supabaseHolidaysApi;
