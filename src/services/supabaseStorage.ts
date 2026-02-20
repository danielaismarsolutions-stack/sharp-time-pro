import { supabase } from '@/lib/supabase';

const BUCKET_NAME = 'barber-avatars';
const AVATAR_FOLDER = 'avatars';

export interface UploadResult {
  url: string;
  path: string;
}

export const supabaseStorageApi = {
  /**
   * Upload a barber avatar image
   * @param file - The image file to upload
   * @param barberId - The barber's UUID
   * @param retries - Number of retry attempts for failed uploads
   * @returns Public URL and storage path
   */
  async uploadAvatar(file: File, barberId: string, retries = 2): Promise<UploadResult> {
    // Generate unique filename: avatars/{barberId}-{timestamp}.{ext}
    const fileExt = file.name.split('.').pop();
    const fileName = `${barberId}-${Date.now()}.${fileExt}`;
    const filePath = `${AVATAR_FOLDER}/${fileName}`;

    // Retry logic for network failures
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Upload file
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false, // Don't overwrite existing files
          });

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(data.path);

        return {
          url: publicUrl,
          path: data.path,
        };
      } catch (error: unknown) {
        if (attempt === retries) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to upload avatar after ${retries + 1} attempts: ${message}`);
        }
        // Wait before retry (exponential backoff: 1s, 2s)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw new Error('Upload failed');
  },

  /**
   * Delete an avatar from storage
   * @param avatarUrl - The full public URL of the avatar
   */
  async deleteAvatar(avatarUrl: string): Promise<void> {
    if (!avatarUrl) return;

    // Extract path from URL
    const path = this.extractPathFromUrl(avatarUrl);
    if (!path) return;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      // Don't throw - deletion failure shouldn't block the main operation
    }
  },

  /**
   * Extract storage path from public URL
   * URL format: https://{project}.supabase.co/storage/v1/object/public/barber-avatars/avatars/file.jpg
   */
  extractPathFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split(`/object/public/${BUCKET_NAME}/`);
      return pathParts[1] || null;
    } catch {
      return null;
    }
  },

  /**
   * Get public URL for an existing avatar path
   */
  getPublicUrl(path: string): string {
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);
    return publicUrl;
  },
};

export default supabaseStorageApi;
