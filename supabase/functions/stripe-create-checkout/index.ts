import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(401, { error: "Token de autorización requerido" });
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const {
      data: { user: authUser },
      error: authErr,
    } = await supabaseAdmin.auth.getUser(token);

    if (authErr || !authUser) {
      return jsonResponse(401, { error: "Sesión expirada. Inicia sesión de nuevo." });
    }

    // 2. Get user profile and verify role
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("users")
      .select("role, business_id")
      .eq("auth_uid", authUser.id)
      .single();

    if (profileErr || !profile) {
      return jsonResponse(403, { error: "No se encontró tu perfil de usuario" });
    }

    if (!["owner", "admin"].includes(profile.role)) {
      return jsonResponse(403, { error: "No tienes permisos para gestionar la suscripción" });
    }

    // 3. Get business data
    const { data: business, error: bizErr } = await supabaseAdmin
      .from("businesses")
      .select("id, business_name, email, monthly_price, stripe_customer_id")
      .eq("id", profile.business_id)
      .single();

    if (bizErr || !business) {
      return jsonResponse(404, { error: "Negocio no encontrado" });
    }

    if (!business.monthly_price || business.monthly_price <= 0) {
      return jsonResponse(400, {
        error: "El precio mensual no está configurado para este negocio",
      });
    }

    // 4. Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-12-18.acacia",
    });

    // 5. Create or reuse Stripe Customer
    let customerId = business.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: business.email,
        name: business.business_name,
        metadata: { business_id: business.id },
      });
      customerId = customer.id;

      // Save customer ID to database
      await supabaseAdmin
        .from("businesses")
        .update({ stripe_customer_id: customerId })
        .eq("id", business.id);
    }

    // 6. Create Checkout Session with inline price_data
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
    });

    return jsonResponse(200, { url: session.url });
  } catch (err) {
    console.error("Error in stripe-create-checkout:", err);
    return jsonResponse(500, { error: "Error interno. Inténtalo de nuevo." });
  }
});
