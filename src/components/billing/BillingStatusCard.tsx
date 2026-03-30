import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, ExternalLink, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { BillingInfo } from '@/services/stripeBilling';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  none: { label: 'Sin suscripción', variant: 'secondary' },
  active: { label: 'Activa', variant: 'default' },
  past_due: { label: 'Pago pendiente', variant: 'destructive' },
  canceled: { label: 'Cancelada', variant: 'destructive' },
  unpaid: { label: 'Impagada', variant: 'destructive' },
  trialing: { label: 'Periodo de prueba', variant: 'outline' },
  incomplete: { label: 'Incompleta', variant: 'secondary' },
  incomplete_expired: { label: 'Expirada', variant: 'destructive' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function formatPrice(price: number | null): string {
  if (price == null) return '—';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
}

interface BillingStatusCardProps {
  billing: BillingInfo;
  onActivate: () => void;
  onManagePayment: () => void;
  isActivating: boolean;
  isOpeningPortal: boolean;
}

export default function BillingStatusCard({
  billing,
  onActivate,
  onManagePayment,
  isActivating,
  isOpeningPortal,
}: BillingStatusCardProps) {
  const isAmbassador = billing.plan_type === 'ambassador';
  const status = statusConfig[billing.subscription_status] ?? statusConfig.none;
  const canActivate = !isAmbassador && billing.subscription_status === 'none' && billing.monthly_price != null && billing.monthly_price > 0;
  const hasSubscription = billing.has_subscription && billing.subscription_status !== 'none';

  if (isAmbassador) {
    return (
      <Card className="border-amber-300 dark:border-amber-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Plan Embajador</CardTitle>
          <Star className="h-5 w-5 text-amber-500" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-100">
            Embajador
          </Badge>
          <p className="text-sm text-muted-foreground">
            Tu negocio tiene acceso completo a Sharp Time Pro como embajador. No se requiere ningún pago.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Estado de la suscripción</CardTitle>
        <CreditCard className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Precio mensual</p>
            <p className="text-2xl font-bold">{formatPrice(billing.monthly_price)}</p>
          </div>
          {billing.current_period_end && (
            <div>
              <p className="text-sm text-muted-foreground">Próximo cobro</p>
              <p className="text-lg font-medium">{formatDate(billing.current_period_end)}</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {canActivate && (
            <Button onClick={onActivate} disabled={isActivating}>
              {isActivating ? 'Redirigiendo...' : 'Activar suscripción'}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          )}
          {hasSubscription && (
            <Button variant="outline" onClick={onManagePayment} disabled={isOpeningPortal}>
              {isOpeningPortal ? 'Abriendo...' : 'Gestionar método de pago'}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          )}
          {!canActivate && !hasSubscription && billing.monthly_price == null && (
            <p className="text-sm text-muted-foreground">
              El precio mensual aún no ha sido asignado a tu negocio. Contacta con soporte.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function BillingStatusCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-5 w-5" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-6 w-24" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-40" />
          </div>
        </div>
        <Skeleton className="h-10 w-40" />
      </CardContent>
    </Card>
  );
}
