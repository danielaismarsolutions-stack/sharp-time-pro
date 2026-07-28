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

type Language = "es" | "en";

// El frontend envía ?lang=en|es (idioma del negocio). Sin parámetro → 'es'.
function resolveLanguage(req: Request): Language {
  try {
    return new URL(req.url).searchParams.get("lang") === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

const MESSAGES: Record<Language, {
  authRequired: string;
  sessionExpired: string;
  profileNotFound: string;
  noPermission: string;
  businessNotFound: string;
  ambassadorNoSubscription: string;
  alreadySubscribed: string;
  priceNotConfigured: string;
  productName: string;
  productDescription: (name: string) => string;
  internal: string;
}> = {
  es: {
    authRequired: "Token de autorización requerido",
    sessionExpired: "Sesión expirada. Inicia sesión de nuevo.",
    profileNotFound: "No se encontró tu perfil de usuario",
    noPermission: "No tienes permisos para gestionar la suscripción",
    businessNotFound: "Negocio no encontrado",
    ambassadorNoSubscription: "Las cuentas de embajador no requieren suscripción",
    alreadySubscribed: "Ya tienes una suscripción activa. Usa el portal de pagos para gestionarla.",
    priceNotConfigured: "El precio mensual no está configurado para este negocio. Contacta con soporte.",
    productName: "Nexio — Suscripción Mensual",
    productDescription: (name) => `Plan mensual para ${name}`,
    internal: "Error interno. Inténtalo de nuevo.",
  },
  en: {
    authRequired: "Authorisation token required",
    sessionExpired: "Your session has expired. Please sign in again.",
    profileNotFound: "Your user profile could not be found",
    noPermission: "You don't have permission to manage the subscription",
    businessNotFound: "Business not found",
    ambassadorNoSubscription: "Ambassador accounts don't need a subscription",
    alreadySubscribed: "You already have an active subscription. Use the payment portal to manage it.",
    priceNotConfigured: "The monthly price is not set up for this business. Please contact support.",
    productName: "Nexio — Monthly Subscription",
    productDescription: (name) => `Monthly plan for ${name}`,
    internal: "Internal error. Please try again.",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  const msg = MESSAGES[resolveLanguage(req)];

  try {
    // 1. Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(401, { error: msg.authRequired }, req);
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
      return jsonResponse(401, { error: msg.sessionExpired }, req);
    }

    // 2. Get user profile and verify role
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("users")
      .select("role, business_id")
      .eq("auth_uid", authUser.id)
      .single();

    if (profileErr || !profile) {
      return jsonResponse(403, { error: msg.profileNotFound }, req);
    }

    if (!["owner", "admin"].includes(profile.role)) {
      return jsonResponse(403, { error: msg.noPermission }, req);
    }

    // 3. Get business data
    const { data: business, error: bizErr } = await supabaseAdmin
      .from("businesses")
      .select("id, business_name, email, monthly_price, stripe_customer_id, stripe_subscription_id, subscription_status, plan_type")
      .eq("id", profile.business_id)
      .single();

    if (bizErr || !business) {
      return jsonResponse(404, { error: msg.businessNotFound }, req);
    }

    // 4. Block ambassador accounts
    if (business.plan_type === "ambassador") {
      return jsonResponse(400, { error: msg.ambassadorNoSubscription }, req);
    }

    // 5. Block if there's already an active or past_due subscription
    if (business.stripe_subscription_id && ["active", "past_due", "trialing"].includes(business.subscription_status ?? "")) {
      return jsonResponse(400, { error: msg.alreadySubscribed }, req);
    }

    if (!business.monthly_price || business.monthly_price <= 0) {
      return jsonResponse(400, {
        error: msg.priceNotConfigured,
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
              name: msg.productName,
              description: msg.productDescription(business.business_name),
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
    return jsonResponse(500, { error: msg.internal }, req);
  }
});
