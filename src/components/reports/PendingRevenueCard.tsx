import { Card, CardContent } from '@/components/ui/card';
import { CircleAlert } from 'lucide-react';

interface PendingRevenueCardProps {
  amount: number;
  count: number;
}

export default function PendingRevenueCard({ amount, count }: PendingRevenueCardProps) {
  const formattedAmount = amount.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  });

  return (
    <Card className="border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20">
      <CardContent className="p-4 md:p-6 flex items-center gap-4">
        <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
          <CircleAlert className="h-5 w-5 md:h-6 md:w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm text-muted-foreground">Pendiente de cobro</p>
          <p className="text-xl md:text-2xl font-bold leading-tight">{formattedAmount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {count} {count === 1 ? 'cita realizada sin pagar' : 'citas realizadas sin pagar'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
