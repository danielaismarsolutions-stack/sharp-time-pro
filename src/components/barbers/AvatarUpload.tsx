import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { imageValidation } from '@/lib/imageValidation';

interface AvatarUploadProps {
  currentAvatarUrl: string | null;
  onFileSelect: (file: File | null) => void;
  onDeleteAvatar?: () => void;
  disabled?: boolean;
  barberName?: string;
}

export default function AvatarUpload({
  currentAvatarUrl,
  onFileSelect,
  onDeleteAvatar,
  disabled = false,
  barberName = '',
}: AvatarUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        imageValidation.revokePreviewUrl(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);

    if (!file) {
      setPreviewUrl(null);
      onFileSelect(null);
      return;
    }

    // Validate file
    const validationError = imageValidation.validateImage(file);
    if (validationError) {
      setError(validationError.message);
      setPreviewUrl(null);
      onFileSelect(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Create preview
    const preview = imageValidation.createPreviewUrl(file);
    setPreviewUrl(preview);
    onFileSelect(file);
  };

  const handleRemoveImage = () => {
    if (previewUrl) {
      imageValidation.revokePreviewUrl(previewUrl);
    }
    setPreviewUrl(null);
    setError(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // If there's an existing avatar (not just a preview), signal deletion
    if (currentAvatarUrl && onDeleteAvatar) {
      onDeleteAvatar();
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayUrl = previewUrl || currentAvatarUrl;

  return (
    <div className="space-y-3">
      <Label className="text-xs">Foto de Perfil</Label>

      <div className="flex items-center gap-4">
        {/* Avatar Preview */}
        <Avatar className="h-20 w-20">
          {displayUrl ? (
            <AvatarImage src={displayUrl} alt={barberName} />
          ) : (
            <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">
              {barberName ? getInitials(barberName) : <ImageIcon className="h-8 w-8" />}
            </AvatarFallback>
          )}
        </Avatar>

        {/* Upload/Remove Buttons */}
        <div className="flex flex-col gap-2 flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
            disabled={disabled}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleButtonClick}
            disabled={disabled}
            className="text-xs h-8"
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            {displayUrl ? 'Cambiar Foto' : 'Subir Foto'}
          </Button>

          {displayUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveImage}
              disabled={disabled}
              className="text-xs h-8 text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Eliminar
            </Button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* Help Text */}
      <p className="text-xs text-muted-foreground">
        JPG, PNG o WebP. Máximo 5MB.
      </p>
    </div>
  );
}
