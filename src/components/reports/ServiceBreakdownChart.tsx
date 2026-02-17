import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

interface ServiceBreakdownChartProps {
  data: Array<{ name: string; revenue: number }>;
}

export default function ServiceBreakdownChart({ data }: ServiceBreakdownChartProps) {
  const hasData = data.length > 0;

  // Add color to each entry
  const coloredData = data.map((item, i) => ({
    ...item,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <Card className="border-border">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base md:text-lg">Por Servicio</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
        <div className="h-[200px] md:h-[300px]">
          {!hasData ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Sin datos para este periodo
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={coloredData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={80} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" name="Ingresos" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
