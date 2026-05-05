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
  Legend,
} from 'recharts';

const chartConfig = {
  collected: { label: 'Cobrado', color: 'hsl(var(--primary))' },
  earned: { label: 'Generado', color: '#f59e0b' },
} satisfies ChartConfig;

interface CollectedVsEarnedChartProps {
  data: Array<{ label: string; collected: number; earned: number }>;
}

export default function CollectedVsEarnedChart({ data }: CollectedVsEarnedChartProps) {
  const hasData = data.some(d => d.collected > 0 || d.earned > 0);

  return (
    <Card className="border-border">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base md:text-lg">Cobrado vs Generado</CardTitle>
        <p className="text-xs text-muted-foreground">
          Cobrado: pagos registrados en la fecha. Generado: precio de las citas realizadas en la fecha.
        </p>
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
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="collected"
                  name="Cobrado"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="earned"
                  name="Generado"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ fill: '#f59e0b', r: 3 }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
