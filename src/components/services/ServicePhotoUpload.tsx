import { useState, useRef, useCallback, useEffect } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { uploadServicePhoto, deleteServicePhoto } from '@/utils/uploadServicePhoto';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/contexts/LanguageContext';

interface ServicePhotoUploadProps {
  serviceId: string;
  businessId: string;
  currentPhotoUrl: string | null;
  onPhotoChange: (url: string | null) => void;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function getExtensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop()?.toLowerCase();
    if (ext && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return ext;
  } catch {
    // ignore
  }
  return 'jpg';
}

export default function ServicePhotoUpload({
  serviceId,
  businessId,
  currentPhotoUrl,
  onPhotoChange,
}: ServicePhotoUploadProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleUpload = useCallback(async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: t('services.photo.invalidFormatTitle'),
        description: t('services.photo.invalidFormatDescription'),
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('services.photo.tooLargeTitle'),
        description: t('services.photo.tooLargeDescription'),
        variant: 'destructive',
      });
      return;
    }

    // Show local preview immediately
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setIsUploading(true);

    try {
      const url = await uploadServicePhoto(file, businessId, serviceId);
      onPhotoChange(url);
      toast({ title: t('services.photo.updated') });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('services.photo.uploadError');
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
      // Revert preview on failure
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [businessId, serviceId, onPhotoChange, toast]);

  const handleDelete = useCallback(async () => {
    if (!currentPhotoUrl) return;

    setIsUploading(true);
    try {
      const ext = getExtensionFromUrl(currentPhotoUrl);
      await deleteServicePhoto(businessId, serviceId, ext);
      setPreviewUrl(null);
      onPhotoChange(null);
      toast({ title: t('services.photo.deleted') });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('services.photo.deleteError');
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  }, [businessId, serviceId, currentPhotoUrl, onPhotoChange, toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const displayUrl = previewUrl || currentPhotoUrl;

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium">{t('services.photo.label')}</p>
      <div className="flex items-center gap-3">
        {/* Thumbnail / Upload area */}
        <div
          className={`
            relative w-[120px] h-[120px] rounded-lg border-2 border-dashed
            flex items-center justify-center cursor-pointer overflow-hidden
            transition-all duration-200 shrink-0
            ${isDragOver ? 'border-primary bg-primary/10 scale-105' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'}
            ${isUploading ? 'pointer-events-none' : ''}
          `}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {displayUrl ? (
            <>
              <img
                src={displayUrl}
                alt={t('services.photo.label')}
                className="w-full h-full object-cover"
              />
              {/* Delete button on hover */}
              {!isUploading && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-destructive transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <ImagePlus className="h-6 w-6" />
              <span className="text-[10px] text-center leading-tight">{t('services.photo.upload')}</span>
            </div>
          )}

          {/* Loading overlay */}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
        />

        <p className="text-[10px] text-muted-foreground leading-relaxed">
          {t('services.photo.formatsHint')}<br />
          {t('services.photo.maxSizeHint')}
        </p>
      </div>
    </div>
  );
}
