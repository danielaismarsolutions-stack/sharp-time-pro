# Push Notifications Setup

This guide explains how to set up Web Push notifications so users receive
phone/browser notifications when a new booking (or any event) is created.

## Architecture

```
New booking → INSERT into notifications table
    → Postgres trigger (pg_net) → Edge Function (send-push-notification)
        → Reads push_subscriptions for user
        → Sends Web Push to each subscription endpoint
            → Service Worker (sw.js) shows native notification
```

## Step 1: Generate VAPID Key Pair

The app already has a VAPID public key. You need to extract the private key
components. If you need to generate a new pair:

```bash
npx web-push generate-vapid-keys --json
```

This outputs:
```json
{
  "publicKey": "BKKBmrY_...",
  "privateKey": "your-private-key-base64url"
}
```

You also need the X and Y coordinates of the public key. You can extract them
using Node.js:

```js
// Run this in Node.js to extract X and Y from your public key
const publicKeyBase64 = 'BKKBmrY_U1UnpLeNNiqbDnoZYR7H-j4j-vMhjaIOwlsi_XOZSqFGijgwI9bonM5fpz3OCseDt44tx6BWr7-bsG0';
const padding = '='.repeat((4 - (publicKeyBase64.length % 4)) % 4);
const base64 = (publicKeyBase64 + padding).replace(/-/g, '+').replace(/_/g, '/');
const raw = Buffer.from(base64, 'base64');
// Skip the first byte (0x04 uncompressed point indicator)
const x = raw.slice(1, 33).toString('base64url');
const y = raw.slice(33, 65).toString('base64url');
console.log('X:', x);
console.log('Y:', y);
```

## Step 2: Set Supabase Secrets

Set these secrets in your Supabase project (Dashboard → Settings → Edge Functions → Secrets,
or via CLI):

```bash
supabase secrets set VAPID_PUBLIC_KEY="BKKBmrY_U1UnpLeNNiqbDnoZYR7H-j4j-vMhjaIOwlsi_XOZSqFGijgwI9bonM5fpz3OCseDt44tx6BWr7-bsG0"
supabase secrets set VAPID_PRIVATE_KEY="your-private-key-base64url"
supabase secrets set VAPID_PUBLIC_KEY_X="the-x-coordinate"
supabase secrets set VAPID_PUBLIC_KEY_Y="the-y-coordinate"
```

## Step 3: Set Postgres Config for pg_net Trigger

In the Supabase SQL Editor, run:

```sql
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://omeeupvetsacxbgojifx.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
```

⚠️ The service role key is needed so the trigger can authenticate with the
Edge Function. You can find it in Dashboard → Settings → API → service_role key.

## Step 4: Enable pg_net Extension

Run in Supabase SQL Editor (or it runs automatically from the migration):

```sql
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```

## Step 5: Deploy the Edge Function

```bash
supabase functions deploy send-push-notification --project-ref omeeupvetsacxbgojifx
```

## Step 6: Run the Migration

Apply the trigger migration:

```bash
supabase db push
```

Or run the SQL from `supabase/migrations/create_push_notification_trigger.sql`
directly in the Supabase SQL Editor.

## Step 7: Test

1. Open the app on your phone and enable push notifications in Settings
2. Create a new booking from another device/browser
3. You should receive a native push notification on your phone

## Troubleshooting

- **No notification received**: Check that `push_subscriptions` table has a row
  for your user with valid `endpoint`, `p256dh`, and `auth` values.
- **Edge Function errors**: Check logs at Dashboard → Edge Functions → Logs.
- **pg_net not working**: Verify the extension is enabled:
  `SELECT * FROM pg_extension WHERE extname = 'pg_net';`
- **Expired subscriptions**: The Edge Function automatically cleans up
  subscriptions that return 404/410 from the push service.
