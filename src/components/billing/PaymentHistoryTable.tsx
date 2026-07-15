import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/i18n';
import type { PaymentRecord } from '@/services/stripeBilling';

const statusLabels: Record<string, { labelKey: TranslationKey; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  paid: { labelKey: 'billing.paymentStatus.paid', variant: 'default' },
  failed: { labelKey: 'billing.paymentStatus.failed', variant: 'destructive' },
  open: { labelKey: 'billing.paymentStatus.open', variant: 'outline' },
  void: { labelKey: 'billing.paymentStatus.void', variant: 'secondary' },
};

function formatDate(dateStr: string, intlLocale: string): string {
  return new Intl.DateTimeFormat(intlLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function formatPrice(amount: number, currency: string, intlLocale: string): string {
  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

interface PaymentHistoryTableProps {
  payments: PaymentRecord[];
}

export default function PaymentHistoryTable({ payments }: PaymentHistoryTableProps) {
  const { t, intlLocale } = useTranslation();

  if (payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {t('billing.paymentHistory')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            {t('billing.noPayments')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          {t('billing.paymentHistory')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.date')}</TableHead>
              <TableHead>{t('billing.amount')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead className="text-right">{t('billing.receipt')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => {
              const statusInfo = statusLabels[payment.status] ?? statusLabels.open;
              return (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {formatDate(payment.created_at, intlLocale)}
                  </TableCell>
                  <TableCell>{formatPrice(payment.amount_paid, payment.currency, intlLocale)}</TableCell>
                  <TableCell>
                    <Badge variant={statusInfo.variant}>{t(statusInfo.labelKey)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.invoice_url ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a href={payment.invoice_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
