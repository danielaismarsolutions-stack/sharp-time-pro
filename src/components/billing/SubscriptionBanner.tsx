import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/contexts/LanguageContext';

export default function SubscriptionBanner() {
  const { t } = useTranslation();

  return (
    <Alert variant="destructive" className="mx-4 mt-3 mb-0 border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800">
      <AlertTriangle className="h-4 w-4 !text-amber-600 dark:!text-amber-400" />
      <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
        <span>{t('billing.banner.pastDue')}</span>
        <Link
          to="/billing"
          className="font-medium underline underline-offset-4 hover:no-underline whitespace-nowrap"
        >
          {t('billing.banner.goToBilling')}
        </Link>
      </AlertDescription>
    </Alert>
  );
}
