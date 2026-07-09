import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReportsData, Period } from '@/hooks/useReportsData';
import KpiCards from '@/components/reports/KpiCards';
import RevenueTrendChart from '@/components/reports/RevenueTrendChart';
import ServiceBreakdownChart from '@/components/reports/ServiceBreakdownChart';
import StatusAndHoursCharts from '@/components/reports/StatusAndHoursCharts';
import TopClients from '@/components/reports/TopClients';
import PaymentMethodChart from '@/components/reports/PaymentMethodChart';
import BarberPerformance from '@/components/reports/BarberPerformance';

export default function Reports() {
  const [period, setPeriod] = useState<Period>('month');
  const { analytics, isLoading } = useReportsData(period);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Informes</h1>
          <p className="text-muted-foreground text-sm">Resumen del rendimiento del negocio</p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="h-11">
            <TabsTrigger value="week" className="text-xs md:text-sm px-2 md:px-3 min-h-[40px]">Semana</TabsTrigger>
            <TabsTrigger value="month" className="text-xs md:text-sm px-2 md:px-3 min-h-[40px]">Mes</TabsTrigger>
            <TabsTrigger value="quarter" className="text-xs md:text-sm px-2 md:px-3 min-h-[40px]">Trim.</TabsTrigger>
            <TabsTrigger value="year" className="text-xs md:text-sm px-2 md:px-3 min-h-[40px]">Año</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPI Cards */}
      <KpiCards kpis={analytics.kpis} />

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <RevenueTrendChart data={analytics.revenueTrend} />
        <ServiceBreakdownChart data={analytics.serviceBreakdown} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <StatusAndHoursCharts
          statusData={analytics.statusDistribution}
          hoursData={analytics.busiestHours}
        />
        <PaymentMethodChart data={analytics.paymentMethods} />
        <TopClients clients={analytics.topClients} />
      </div>

      {/* Per-Barber Breakdown */}
      <BarberPerformance barberMetrics={analytics.barberMetrics} />
    </div>
  );
}
