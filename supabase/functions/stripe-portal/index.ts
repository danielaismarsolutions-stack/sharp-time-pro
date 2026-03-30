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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
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

    // 3. Get business Stripe customer ID
    const { data: business, error: bizErr } = await supabaseAdmin
      .from("businesses")
      .select("stripe_customer_id")
      .eq("id", profile.business_id)
      .single();

    if (bizErr || !business || !business.stripe_customer_id) {
      return jsonResponse(400, {
        error: "No hay una suscripción activa. Primero activa tu suscripción.",
      });
    }

    // 4. Create Stripe Billing Portal session
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-12-18.acacia",
    });

    const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "http://localhost:5173";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: business.stripe_customer_id,
      return_url: `${FRONTEND_URL}/billing`,
    });

    return jsonResponse(200, { url: portalSession.url });
  } catch (err) {
    console.error("Error in stripe-portal:", err);
    return jsonResponse(500, { error: "Error interno. Inténtalo de nuevo." });
  }
});
