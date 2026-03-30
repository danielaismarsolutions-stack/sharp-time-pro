import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";

function getCorsOrigin(req: Request): string {
  const frontendUrl = Deno.env.get("FRONTEND_URL");
  if (!frontendUrl) return "*";
  const allowed = frontendUrl.replace(/\/$/, "");
  const origin = req.headers.get("Origin") || "";
  return origin === allowed ? allowed : "";
}

function corsHeaders(req: Request) {
  const origin = getCorsOrigin(req);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (origin !== "*") headers["Vary"] = "Origin";
  return headers;
}

function jsonResponse(status: number, body: Record<string, unknown>, req: Request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    // 1. Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(401, { error: "Token de autorización requerido" }, req);
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const {
      data: { user: authUser },
      error: authErr,
    } = await supabaseAdmin.auth.getUser(token);

    if (authErr || !authUser) {
      return jsonResponse(401, { error: "Sesión expirada. Inicia sesión de nuevo." }, req);
    }

    // 2. Get user profile and verify role
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("users")
      .select("role, business_id")
      .eq("auth_uid", authUser.id)
      .single();

    if (profileErr || !profile) {
      return jsonResponse(403, { error: "No se encontró tu perfil de usuario" }, req);
    }

    if (!["owner", "admin"].includes(profile.role)) {
      return jsonResponse(403, { error: "No tienes permisos para gestionar la suscripción" }, req);
    }

    // 3. Get business data
    const { data: business, error: bizErr } = await supabaseAdmin
      .from("businesses")
      .select("id, business_name, email, monthly_price, stripe_customer_id, stripe_subscription_id, subscription_status, plan_type")
      .eq("id", profile.business_id)
      .single();

    if (bizErr || !business) {
      return jsonResponse(404, { error: "Negocio no encontrado" }, req);
    }

    // 4. Block ambassador accounts — they don't pay
    if (business.plan_type === "ambassador") {
      return jsonResponse(400, { error: "Las cuentas de embajador no requieren suscripción" }, req);
    }

    // 5. Block if there's already an active or past_due subscription
    if (business.stripe_subscription_id && ["active", "past_due", "trialing"].includes(business.subscription_status ?? "")) {
      return jsonResponse(400, { error: "Ya tienes una suscripción activa. Usa el portal de pagos para gestionarla." }, req);
    }

    if (!business.monthly_price || business.monthly_price <= 0) {
      return jsonResponse(400, {
        error: "El precio mensual no está configurado para este negocio. Contacta con soporte.",
      }, req);
    }

    // 6. Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-12-18.acacia",
    });

    // 7. Create or reuse Stripe Customer
    let customerId = business.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: business.email,
        name: business.business_name,
        metadata: { business_id: business.id },
      });
      customerId = customer.id;

      await supabaseAdmin
        .from("businesses")
        .update({ stripe_customer_id: customerId })
        .eq("id", business.id);
    }

    // 8. Create Checkout Session with inline price_data
    const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Nexio — Suscripción Mensual",
              description: `Plan mensual para ${business.business_name}`,
            },
            unit_amount: Math.round(business.monthly_price * 100),
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      success_url: `${FRONTEND_URL}/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/billing?canceled=true`,
      metadata: { business_id: business.id },
      subscription_data: {
        metadata: { business_id: business.id },
      },
    });

    return jsonResponse(200, { url: session.url }, req);
  } catch (err) {
    console.error("Error in stripe-create-checkout:", err);
    return jsonResponse(500, { error: "Error interno. Inténtalo de nuevo." }, req);
  }
});
