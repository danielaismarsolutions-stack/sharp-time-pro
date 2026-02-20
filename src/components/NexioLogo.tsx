import { cn } from '@/lib/utils';

interface NexioLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

/**
 * Nexio "N" mark logo — a geometric N shape inspired by the brand identity.
 */
export function NexioMark({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 'w-6 h-6', md: 'w-8 h-8', lg: 'w-10 h-10' };

  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(sizeMap[size], className)}
    >
      <rect width="40" height="40" rx="10" fill="url(#nexio-gradient)" />
      <path
        d="M12 28V12h3.2l9.6 11.2V12H28v16h-3.2L15.2 16.8V28H12Z"
        fill="white"
      />
      <defs>
        <linearGradient id="nexio-gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(262, 83%, 58%)" />
          <stop offset="1" stopColor="hsl(280, 75%, 50%)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function NexioLogo({ className, size = 'md', showText = true }: NexioLogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <NexioMark size={size} />
      {showText && (
        <span className="font-semibold tracking-tight text-sidebar-foreground">
          Nexio
        </span>
      )}
    </div>
  );
}
