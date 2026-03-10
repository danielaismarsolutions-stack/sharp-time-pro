import { cn } from '@/lib/utils';
import { useBusinessBrand } from '@/contexts/BusinessBrandContext';

interface NexioLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function NexioMark({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 'w-6 h-6', md: 'w-8 h-8', lg: 'w-10 h-10' };
  const { brand } = useBusinessBrand();

  return (
    <img
      src={brand.logoUrl || '/logodefi.png'}
      alt={brand.businessName || 'Logo'}
      className={cn(sizeMap[size], 'rounded-lg object-contain', className)}
    />
  );
}

export function NexioLogo({ className, size = 'md', showText = true }: NexioLogoProps) {
  const { brand } = useBusinessBrand();

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <NexioMark size={size} />
      {showText && (
        <span className="font-semibold tracking-tight text-sidebar-foreground">
          {brand.businessName || 'Nexio'}
        </span>
      )}
    </div>
  );
}
