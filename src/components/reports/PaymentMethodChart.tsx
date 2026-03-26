import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Banknote, CreditCard, Smartphone, CircleOff } from 'lucide-react';

const chartConfig = {
  count: { label: 'Citas' },
} satisfies ChartConfig;

const METHOD_ICONS: Record<string, typeof Banknote> = {
  cash: Banknote,
  card: CreditCard,
  bizum: Smartphone,
  unpaid: CircleOff,
};

interface PaymentMethodChartProps {
  data: Array<{ method: string; label: string; count: number; revenue: number; color: string }>;
}

export default function PaymentMethodChart({ data }: PaymentMethodChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const hasData = total > 0;
  const paidItems = data.filter(d => d.method !== 'unpaid');
  const paidTotal = paidItems.reduce((sum, d) => sum + d.count, 0);
  const paidRevenue = paidItems.reduce((sum, d) => sum + d.revenue, 0);

  // Chart data for the donut (only payment methods, not unpaid)
  const chartData = data.filter(d => d.count > 0).map(d => ({
    name: d.label,
    value: d.count,
    color: d.color,
  }));

  return (
    <Card className="border-border">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base md:text-lg">Metodos de Pago</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
        {!hasData ? (
          <div className="flex items-center justify-center h-[180px] md:h-[250px] text-muted-foreground text-sm">
            Sin datos para este periodo
          </div>
        ) : (
          <div className="space-y-4">
            {/* Donut Chart */}
            <div className="h-[160px] md:h-[180px]">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <RechartsPie>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </RechartsPie>
              </ChartContainer>
            </div>

            {/* Breakdown List */}
            <div className="space-y-2">
              {data.filter(d => d.count > 0).map((item) => {
                const Icon = METHOD_ICONS[item.method] || CircleOff;
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;

                return (
                  <div key={item.method} className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${item.color}20` }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{item.label}</span>
                        <span className="text-xs text-muted-foreground">{item.count} citas</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-bold tabular-nums shrink-0 w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">Cobrado</span>
              <div className="text-right">
                <span className="text-sm font-bold">
                  {paidRevenue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })}
                </span>
                <span className="text-[10px] text-muted-foreground ml-1.5">
                  ({paidTotal} de {total} citas)
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
