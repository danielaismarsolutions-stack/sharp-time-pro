import {
  DollarSign,
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReportsAnalytics } from '@/hooks/useReportsData';

interface KpiCardsProps {
  kpis: ReportsAnalytics['kpis'];
}

function TrendIndicator({ change, direction, suffix = '%' }: { change: number; direction: 'up' | 'down' | 'neutral'; suffix?: string }) {
  if (direction === 'neutral') {
    return (
      <div className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground">
        <Minus className="h-3 w-3 md:h-4 md:w-4" />
        <span>0{suffix}</span>
      </div>
    );
  }

  const isUp = direction === 'up';
  const Icon = isUp ? TrendingUp : TrendingDown;
  const color = isUp ? 'text-status-success' : 'text-destructive';

  return (
    <div className={`flex items-center gap-1 text-xs md:text-sm ${color}`}>
      <Icon className="h-3 w-3 md:h-4 md:w-4" />
      <span>{isUp ? '+' : '-'}{change}{suffix}</span>
    </div>
  );
}

export default function KpiCards({ kpis }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {/* Revenue */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
          <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
            Ingresos
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground hidden sm:block" />
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
          <p className="text-xl md:text-2xl font-bold">{kpis.revenue.value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })}</p>
          <TrendIndicator change={kpis.revenue.change} direction={kpis.revenue.direction} />
        </CardContent>
      </Card>

      {/* Bookings */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
          <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
            Citas
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground hidden sm:block" />
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
          <p className="text-xl md:text-2xl font-bold">{kpis.bookingsCount.value}</p>
          <p className="text-[10px] md:text-sm text-muted-foreground">
            {kpis.bookingsCount.completed} completadas
          </p>
        </CardContent>
      </Card>

      {/* Completion Rate */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
          <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
            Completadas
          </CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground hidden sm:block" />
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
          <p className="text-xl md:text-2xl font-bold text-status-success">{kpis.completionRate.value}%</p>
          <p className="text-[10px] md:text-sm text-muted-foreground">
            {kpis.completionRate.noShowCount} no asistieron
          </p>
        </CardContent>
      </Card>

      {/* Avg Per Booking */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
          <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
            Prom./Cita
          </CardTitle>
          <PieChart className="h-4 w-4 text-muted-foreground hidden sm:block" />
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
          <p className="text-xl md:text-2xl font-bold">
            {kpis.avgPerBooking.value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })}
          </p>
          <p className="text-[10px] md:text-sm text-muted-foreground">
            {kpis.avgPerBooking.uniqueClients} clientes
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
