// Supabase Service Categories API
// CRUD for editable service categories per business

import { SUPABASE_CONFIG } from '@/config/api';
import { getAuthHeaders, supabase } from '@/lib/supabase';
import { getBusinessId } from '@/config/session';
import { t } from '@/i18n';

export interface ServiceCategory {
  id: string;
  slug: string;
  label: string;
  subtitle: string | null;
  photoUrl: string | null;
  displayOrder: number;
  isActive: boolean;
}

interface DbCategory {
  id: string;
  business_id: string;
  slug: string;
  label: string;
  subtitle: string | null;
  photo_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function mapDb(c: DbCategory): ServiceCategory {
  return {
    id: c.id,
    slug: c.slug,
    label: c.label,
    subtitle: c.subtitle ?? null,
    photoUrl: c.photo_url ?? null,
    displayOrder: c.display_order,
    isActive: c.is_active,
  };
}

async function sbFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${SUPABASE_CONFIG.url}/rest/v1${endpoint}`;
  const authHeaders = await getAuthHeaders();
  const config: RequestInit = {
    ...options,
    headers: {
      ...authHeaders,
      'Prefer': options.method === 'POST' || options.method === 'PATCH'
        ? 'return=representation'
        : 'return=minimal',
      ...options.headers,
    },
  };
  const response = await fetch(url, config);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase error: ${response.status} - ${errorText}`);
  }
  if (response.status === 204) return undefined as T;
  return await response.json();
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50);
}

export const supabaseServiceCategoriesApi = {
  getAll: async (includeInactive = true): Promise<ServiceCategory[]> => {
    let endpoint = `/service_categories?business_id=eq.${getBusinessId()}&order=display_order.asc,label.asc`;
    if (!includeInactive) endpoint += '&is_active=eq.true';
    const data = await sbFetch<DbCategory[]>(endpoint);
    return data.map(mapDb);
  },

  create: async (input: { label: string; slug?: string; subtitle?: string | null; displayOrder?: number }): Promise<ServiceCategory> => {
    const slug = (input.slug && input.slug.trim()) ? slugify(input.slug) : slugify(input.label);
    if (!slug) throw new Error(t('services.errors.slugGenerationFailed'));

    const body = {
      business_id: getBusinessId(),
      slug,
      label: input.label.trim(),
      subtitle: input.subtitle?.trim() || null,
      display_order: input.displayOrder ?? 999,
      is_active: true,
    };
    const data = await sbFetch<DbCategory[]>('/service_categories', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return mapDb(data[0]);
  },

  update: async (
    id: string,
    updates: Partial<Pick<ServiceCategory, 'label' | 'subtitle' | 'photoUrl' | 'isActive' | 'displayOrder'>>,
  ): Promise<ServiceCategory> => {
    const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.label !== undefined) body.label = updates.label.trim();
    if (updates.subtitle !== undefined) body.subtitle = updates.subtitle?.trim() || null;
    if (updates.photoUrl !== undefined) body.photo_url = updates.photoUrl;
    if (updates.isActive !== undefined) body.is_active = updates.isActive;
    if (updates.displayOrder !== undefined) body.display_order = updates.displayOrder;

    const endpoint = `/service_categories?id=eq.${id}&business_id=eq.${getBusinessId()}`;
    const data = await sbFetch<DbCategory[]>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    if (!data || data.length === 0) throw new Error(t('services.errors.categoryNotFound'));
    return mapDb(data[0]);
  },

  delete: async (id: string): Promise<void> => {
    const endpoint = `/service_categories?id=eq.${id}&business_id=eq.${getBusinessId()}`;
    await sbFetch<void>(endpoint, { method: 'DELETE' });
  },

  updateOrder: async (orderedIds: string[]): Promise<void> => {
    const updates = orderedIds.map((id, index) =>
      sbFetch<void>(`/service_categories?id=eq.${id}&business_id=eq.${getBusinessId()}`, {
        method: 'PATCH',
        body: JSON.stringify({ display_order: index, updated_at: new Date().toISOString() }),
      })
    );
    await Promise.all(updates);
  },

  /**
   * Upload a cover photo to Supabase Storage and update photo_url.
   * Bucket: services_photos, path: {businessId}/categories/{slug}.{ext}
   */
  uploadPhoto: async (categoryId: string, slug: string, file: File): Promise<string> => {
    const businessId = getBusinessId();
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const filePath = `${businessId}/categories/${slug}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('services_photos')
      .upload(filePath, file, { cacheControl: '3600', upsert: true, contentType: file.type });
    if (uploadError) throw new Error(t('services.errors.photoUploadFailed', { message: uploadError.message }));

    const { data: { publicUrl } } = supabase.storage.from('services_photos').getPublicUrl(filePath);
    const url = `${publicUrl}?t=${Date.now()}`;

    await supabaseServiceCategoriesApi.update(categoryId, { photoUrl: url });
    return url;
  },

  removePhoto: async (categoryId: string): Promise<void> => {
    await supabaseServiceCategoriesApi.update(categoryId, { photoUrl: null });
  },
};

export default supabaseServiceCategoriesApi;
