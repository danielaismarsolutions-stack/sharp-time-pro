import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SubscriptionBanner() {
  return (
    <Alert variant="destructive" className="mx-4 mt-3 mb-0 border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800">
      <AlertTriangle className="h-4 w-4 !text-amber-600 dark:!text-amber-400" />
      <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
        <span>Tu suscripción tiene un pago pendiente. Por favor, actualiza tu método de pago.</span>
        <Link
          to="/billing"
          className="font-medium underline underline-offset-4 hover:no-underline whitespace-nowrap"
        >
          Ir a Facturación
        </Link>
      </AlertDescription>
    </Alert>
  );
}
