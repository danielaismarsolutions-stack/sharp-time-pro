import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const chartConfig = {
  revenue: { label: 'Ingresos', color: 'hsl(var(--primary))' },
} satisfies ChartConfig;

interface RevenueTrendChartProps {
  data: Array<{ label: string; revenue: number; bookings: number }>;
}

export default function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const hasData = data.some(d => d.revenue > 0 || d.bookings > 0);

  return (
    <Card className="border-border">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base md:text-lg">Tendencia de Ingresos</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
        <div className="h-[200px] md:h-[300px]">
          {!hasData ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Sin datos para este periodo
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Ingresos"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
