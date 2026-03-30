import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";

// No CORS headers needed — this endpoint is called by Stripe, not the browser.

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // Only accept POST
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2024-12-18.acacia",
  });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1. Verify webhook signature
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return jsonResponse(400, { error: "Missing stripe-signature header" });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return jsonResponse(400, { error: "Invalid signature" });
  }

  // 2. Handle events
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const businessId = session.metadata?.business_id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (!businessId || !subscriptionId) {
          console.error("Missing business_id or subscription in checkout session");
          break;
        }

        // Fetch subscription to get current_period_end
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        await supabaseAdmin
          .from("businesses")
          .update({
            stripe_subscription_id: subscriptionId,
            subscription_status: "active",
            current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
          })
          .eq("id", businessId);

        console.log(`Checkout completed for business ${businessId}`);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;

        if (!subscriptionId) break;

        // Find business by subscription ID
        const { data: business } = await supabaseAdmin
          .from("businesses")
          .select("id")
          .eq("stripe_subscription_id", subscriptionId)
          .single();

        if (!business) {
          console.error(`No business found for subscription ${subscriptionId}`);
          break;
        }

        // Insert payment record (idempotent via UNIQUE constraint)
        await supabaseAdmin.from("payment_history").upsert(
          {
            business_id: business.id,
            stripe_invoice_id: invoice.id,
            amount_paid: (invoice.amount_paid ?? 0) / 100,
            currency: invoice.currency ?? "eur",
            status: "paid",
            invoice_url: invoice.hosted_invoice_url ?? null,
            period_start: invoice.period_start
              ? new Date(invoice.period_start * 1000).toISOString()
              : null,
            period_end: invoice.period_end
              ? new Date(invoice.period_end * 1000).toISOString()
              : null,
          },
          { onConflict: "stripe_invoice_id" }
        );

        // Fetch subscription to update current_period_end
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        await supabaseAdmin
          .from("businesses")
          .update({
            subscription_status: "active",
            current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
          })
          .eq("id", business.id);

        console.log(`Invoice paid for business ${business.id}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;

        if (!subscriptionId) break;

        const { data: business } = await supabaseAdmin
          .from("businesses")
          .select("id")
          .eq("stripe_subscription_id", subscriptionId)
          .single();

        if (!business) break;

        // Record the failed payment
        await supabaseAdmin.from("payment_history").upsert(
          {
            business_id: business.id,
            stripe_invoice_id: invoice.id,
            amount_paid: (invoice.amount_paid ?? 0) / 100,
            currency: invoice.currency ?? "eur",
            status: "failed",
            invoice_url: invoice.hosted_invoice_url ?? null,
            period_start: invoice.period_start
              ? new Date(invoice.period_start * 1000).toISOString()
              : null,
            period_end: invoice.period_end
              ? new Date(invoice.period_end * 1000).toISOString()
              : null,
          },
          { onConflict: "stripe_invoice_id" }
        );

        await supabaseAdmin
          .from("businesses")
          .update({ subscription_status: "past_due" })
          .eq("id", business.id);

        console.log(`Invoice payment failed for business ${business.id}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        const { data: business } = await supabaseAdmin
          .from("businesses")
          .select("id")
          .eq("stripe_subscription_id", subscription.id)
          .single();

        if (!business) break;

        await supabaseAdmin
          .from("businesses")
          .update({
            subscription_status: subscription.status,
            current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
          })
          .eq("id", business.id);

        console.log(`Subscription updated for business ${business.id}: ${subscription.status}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const { data: business } = await supabaseAdmin
          .from("businesses")
          .select("id")
          .eq("stripe_subscription_id", subscription.id)
          .single();

        if (!business) break;

        await supabaseAdmin
          .from("businesses")
          .update({
            subscription_status: "canceled",
            current_period_end: null,
          })
          .eq("id", business.id);

        console.log(`Subscription canceled for business ${business.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return jsonResponse(200, { received: true });
  } catch (err) {
    console.error("Error processing webhook event:", err);
    return jsonResponse(500, { error: "Webhook processing failed" });
  }
});
