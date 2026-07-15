import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/contexts/LanguageContext';

interface TopClientsProps {
  clients: Array<{ name: string; revenue: number; visits: number }>;
}

export default function TopClients({ clients }: TopClientsProps) {
  const { t, intlLocale } = useTranslation();
  return (
    <Card className="border-border md:col-span-2 lg:col-span-1">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base md:text-lg">{t('reports.topClients.title')}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
        {clients.length === 0 ? (
          <div className="flex items-center justify-center h-[180px] md:h-[250px] text-muted-foreground text-sm">
            {t('reports.noDataForPeriod')}
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {clients.map((client, index) => (
              <div key={client.name} className="flex items-center gap-3 min-h-[44px]">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{client.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      client.visits === 1 ? 'reports.topClients.visitsOne' : 'reports.topClients.visitsOther',
                      { count: client.visits }
                    )}
                  </p>
                </div>
                <p className="font-bold text-sm shrink-0">
                  {client.revenue.toLocaleString(intlLocale, { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
