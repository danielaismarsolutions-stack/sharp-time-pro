import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import BillingStatusCard, { BillingStatusCardSkeleton } from '@/components/billing/BillingStatusCard';
import PaymentHistoryTable from '@/components/billing/PaymentHistoryTable';
import {
  useBillingInfo,
  useCreateCheckoutSession,
  useCreatePortalSession,
  useInvalidateQuery,
} from '@/hooks/useQueryHooks';

export default function Billing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { invalidateBilling } = useInvalidateQuery();
  const { data: billing, isLoading, error } = useBillingInfo();
  const checkoutMutation = useCreateCheckoutSession();
  const portalMutation = useCreatePortalSession();

  // Handle return from Stripe Checkout
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const canceled = searchParams.get('canceled');

    if (sessionId) {
      toast.success('Suscripción activada correctamente');
      invalidateBilling();
      setSearchParams({}, { replace: true });
    } else if (canceled) {
      toast.info('Proceso de pago cancelado');
      setSearchParams({}, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <CreditCard className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Facturación</h1>
      </div>

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            Error al cargar los datos de facturación: {(error as Error).message}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading state */}
      {isLoading && <BillingStatusCardSkeleton />}

      {/* Billing data */}
      {billing && (
        <>
          <BillingStatusCard
            billing={billing}
            onActivate={() => checkoutMutation.mutate()}
            onManagePayment={() => portalMutation.mutate()}
            isActivating={checkoutMutation.isPending}
            isOpeningPortal={portalMutation.isPending}
          />

          {/* Mutation errors */}
          {checkoutMutation.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {(checkoutMutation.error as Error).message}
              </AlertDescription>
            </Alert>
          )}
          {portalMutation.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {(portalMutation.error as Error).message}
              </AlertDescription>
            </Alert>
          )}

          <PaymentHistoryTable payments={billing.payment_history} />
        </>
      )}
    </div>
  );
}
