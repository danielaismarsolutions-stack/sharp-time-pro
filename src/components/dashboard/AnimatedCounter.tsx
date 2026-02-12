import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number;
  previousValue?: number;
  prefix?: string;
  celebrateAt?: number[];
  className?: string;
}

const DEFAULT_MILESTONES = [100, 500, 1000, 2000, 5000];

export function AnimatedCounter({
  value,
  previousValue = 0,
  prefix = '€',
  celebrateAt = DEFAULT_MILESTONES,
  className,
}: AnimatedCounterProps) {
  const { toast } = useToast();
  const previousMilestone = useRef<number>(0);
  const [displayValue, setDisplayValue] = useState(0);
  
  // Spring animation for smooth counting
  const springValue = useSpring(0, {
    stiffness: 100,
    damping: 30,
    duration: 1,
  });

  // Update spring when value changes
  useEffect(() => {
    springValue.set(value);
  }, [value, springValue]);

  // Subscribe to spring changes and update display value
  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      setDisplayValue(Math.round(latest));
    });
    return () => unsubscribe();
  }, [springValue]);

  // Check for milestone celebrations
  useEffect(() => {
    const sortedMilestones = [...celebrateAt].sort((a, b) => a - b);
    
    for (const milestone of sortedMilestones) {
      // Check if we just crossed this milestone
      if (value >= milestone && previousMilestone.current < milestone) {
        // Trigger confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'],
        });
        
        // Show toast
        toast({
          title: `🎉 ¡${milestone}${prefix} alcanzados hoy!`,
          description: '¡Felicidades por el logro!',
        });
        
        break; // Only celebrate one milestone at a time
      }
    }
    
    previousMilestone.current = value;
  }, [value, celebrateAt, prefix, toast]);

  // Calculate trend
  const trendPercentage = previousValue > 0 
    ? ((value - previousValue) / previousValue) * 100 
    : 0;
  
  const isPositive = trendPercentage > 0;
  const isNegative = trendPercentage < 0;
  const isNeutral = trendPercentage === 0;

  // Format number with Spanish locale (1.234,56)
  const formatNumber = (num: number) => {
    return num.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Main value */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-3xl md:text-4xl font-bold tracking-tight"
      >
        {prefix}{formatNumber(displayValue)}
      </motion.div>

      {/* Trend indicator */}
      {previousValue > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={cn(
            'flex items-center gap-1 text-sm font-medium mt-1',
            isPositive && 'text-emerald-500',
            isNegative && 'text-red-500',
            isNeutral && 'text-muted-foreground'
          )}
        >
          {isPositive && <TrendingUp className="h-4 w-4" />}
          {isNegative && <TrendingDown className="h-4 w-4" />}
          {isNeutral && <Minus className="h-4 w-4" />}
          <span>
            {isPositive && '+'}
            {trendPercentage.toFixed(1)}%
          </span>
          <span className="text-muted-foreground text-xs ml-1">
            vs ayer
          </span>
        </motion.div>
      )}

      {/* Label */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xs text-muted-foreground mt-1"
      >
        Ingresos hoy
      </motion.p>
    </div>
  );
}
