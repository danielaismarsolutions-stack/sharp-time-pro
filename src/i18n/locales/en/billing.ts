import type { LocaleShape } from '../../types';
import type { billing as esBilling } from '../es/billing';

export const billing: LocaleShape<typeof esBilling> = {
  title: 'Billing',
  subscriptionActivated: 'Subscription activated successfully',
  checkoutCancelled: 'Payment process cancelled',
  loadError: 'Failed to load billing data: {message}',
  status: {
    none: 'No subscription',
    active: 'Active',
    pastDue: 'Payment due',
    canceled: 'Cancelled',
    unpaid: 'Unpaid',
    trialing: 'Trial period',
    incomplete: 'Incomplete',
    incompleteExpired: 'Expired',
  },
  ambassador: {
    title: 'Ambassador plan',
    badge: 'Ambassador',
    description:
      'Your business has full access to Nexio as an ambassador. No payment is required.',
  },
  subscriptionStatus: 'Subscription status',
  monthlyPrice: 'Monthly price',
  nextCharge: 'Next charge',
  activate: 'Activate subscription',
  redirecting: 'Redirecting...',
  managePayment: 'Manage payment method',
  openingPortal: 'Opening...',
  noPriceAssigned:
    'A monthly price has not been assigned to your business yet. Please contact support.',
  paymentHistory: 'Payment history',
  noPayments: 'No payments recorded yet',
  amount: 'Amount',
  receipt: 'Receipt',
  paymentStatus: {
    paid: 'Paid',
    failed: 'Failed',
    open: 'Pending',
    void: 'Void',
  },
  banner: {
    pastDue: 'Your subscription has a pending payment. Please update your payment method.',
    goToBilling: 'Go to Billing',
  },
  errors: {
    invalidResponse: '{fn}: invalid response (HTTP {status})',
    http: 'HTTP error {status}',
  },
} as const;
