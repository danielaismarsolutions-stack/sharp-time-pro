import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface StatusAndHoursChartsProps {
  statusData: Array<{ name: string; value: number; color: string }>;
  hoursData: Array<{ hour: string; bookings: number }>;
}

export default function StatusAndHoursCharts({ statusData, hoursData }: StatusAndHoursChartsProps) {
  const hasStatusData = statusData.length > 0;
  const hasHoursData = hoursData.some(d => d.bookings > 0);

  return (
    <>
      {/* Booking Status Donut */}
      <Card className="border-border">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base md:text-lg">Estado de Citas</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
          <div className="h-[180px] md:h-[250px]">
            {!hasStatusData ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Sin datos para este periodo
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </RechartsPie>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Busiest Hours */}
      <Card className="border-border">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base md:text-lg">Horas Más Ocupadas</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
          <div className="h-[180px] md:h-[250px]">
            {!hasHoursData ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Sin datos para este periodo
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hoursData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={9} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="bookings" name="Citas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
