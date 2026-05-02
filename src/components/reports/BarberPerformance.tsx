import { Users, Scissors, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BarberMetric } from '@/hooks/useReportsData';

interface BarberPerformanceProps {
  barberMetrics: BarberMetric[];
}

function BarberCard({ metric }: { metric: BarberMetric }) {
  return (
    <Card className="border-border">
      <CardContent className="p-4">
        {/* Barber header */}
        <div className="flex items-center gap-3 mb-4">
          {metric.avatarUrl ? (
            <img
              src={metric.avatarUrl}
              alt={metric.barberName}
              className="w-10 h-10 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold">
                {metric.barberName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{metric.barberName}</p>
            <p className="text-xs text-muted-foreground">{metric.revenueShare}% del total</p>
          </div>
        </div>

        {/* Revenue bar */}
        <div className="mb-3">
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-xs text-muted-foreground">Ingresos</span>
            <span className="text-sm font-bold">
              {metric.revenue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all"
              style={{ width: `${Math.min(metric.revenueShare, 100)}%` }}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Citas:</span>
            <span className="font-medium">{metric.bookingsCount}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Completadas: </span>
            <span className={`font-medium ${metric.completionRate >= 80 ? 'text-status-success' : metric.completionRate >= 60 ? 'text-yellow-500' : 'text-destructive'}`}>
              {metric.completionRate}%
            </span>
          </div>
          {metric.noShowCount > 0 && (
            <div className="flex items-center gap-1.5 col-span-2">
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
              <span className="text-yellow-600">{metric.noShowCount} no asistieron</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 col-span-2">
            <Scissors className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground truncate">Top: {metric.topService}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BarberPerformance({ barberMetrics }: BarberPerformanceProps) {
  if (barberMetrics.length === 0) {
    return (
      <Card className="border-border">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base md:text-lg">Rendimiento por Estilista</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
          <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
            Sin datos de estilistas para este periodo
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h2 className="text-base md:text-lg font-bold mb-3 md:mb-4">Rendimiento por Estilista</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        {barberMetrics.map(metric => (
          <BarberCard key={metric.barberName} metric={metric} />
        ))}
      </div>
    </div>
  );
}
