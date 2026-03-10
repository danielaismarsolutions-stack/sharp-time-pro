import { supabase } from '@/lib/supabase';

const BUCKET_NAME = 'services_photos';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_DIMENSION = 800;
const JPEG_QUALITY = 0.8;

function getExtensionFromFile(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext) return ext;
  // Fallback from MIME type
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return mimeMap[file.type] || 'jpg';
}

/**
 * Compress and resize an image client-side before upload.
 * Targets max 800x800px, quality 0.8 for JPEG/WebP.
 * GIF and PNG are returned as-is to avoid breaking transparency/animation.
 */
async function optimizeImage(file: File): Promise<File> {
  // Skip optimization for GIFs (animation) and small files
  if (file.type === 'image/gif' || file.size < 100 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Only resize if larger than max dimension
      if (img.width <= MAX_DIMENSION && img.height <= MAX_DIMENSION) {
        // Still compress JPEG/WebP even if dimensions are fine
        if (file.type === 'image/png') {
          resolve(file);
          return;
        }
      }

      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      const outputType = file.type === 'image/png' ? 'image/png' : 'image/webp';
      const quality = outputType === 'image/png' ? undefined : JPEG_QUALITY;

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
            return;
          }
          const optimizedFile = new File([blob], file.name, { type: outputType });
          resolve(optimizedFile);
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

/**
 * Upload a service photo to Supabase Storage and update the service record.
 */
export async function uploadServicePhoto(
  file: File,
  businessId: string,
  serviceId: string
): Promise<string> {
  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Formato no permitido. Usa JPG, PNG, WebP o GIF');
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('La imagen debe ser menor a 5MB');
  }

  // Optimize image before upload
  const optimizedFile = await optimizeImage(file);

  const ext = getExtensionFromFile(optimizedFile);
  const filePath = `${businessId}/${serviceId}.${ext}`;

  // Upload to storage with upsert to replace existing
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, optimizedFile, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Error al subir la imagen: ${uploadError.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  // Add cache-bust param so browsers show the new image after re-upload
  const url = `${publicUrl}?t=${Date.now()}`;

  // Update the service record with the photo URL
  const { error: updateError } = await supabase
    .from('services')
    .update({ service_photo: url })
    .eq('id', serviceId)
    .eq('business_id', businessId);

  if (updateError) {
    throw new Error(`Error al actualizar el servicio: ${updateError.message}`);
  }

  return url;
}

/**
 * Delete a service photo from Supabase Storage and clear the service record.
 */
export async function deleteServicePhoto(
  businessId: string,
  serviceId: string,
  fileExtension: string
): Promise<void> {
  const filePath = `${businessId}/${serviceId}.${fileExtension}`;

  const { error: deleteError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath]);

  if (deleteError) {
    throw new Error(`Error al eliminar la imagen: ${deleteError.message}`);
  }

  // Clear the service_photo column
  const { error: updateError } = await supabase
    .from('services')
    .update({ service_photo: null })
    .eq('id', serviceId)
    .eq('business_id', businessId);

  if (updateError) {
    throw new Error(`Error al actualizar el servicio: ${updateError.message}`);
  }
}
