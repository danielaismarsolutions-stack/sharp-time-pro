import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      return jsonResponse(403, { error: "No tienes permisos para ver la facturación" });
    }

    // 3. Get business billing data
    const { data: business, error: bizErr } = await supabaseAdmin
      .from("businesses")
      .select(
        "monthly_price, subscription_status, current_period_end, stripe_customer_id, stripe_subscription_id"
      )
      .eq("id", profile.business_id)
      .single();

    if (bizErr || !business) {
      return jsonResponse(404, { error: "Negocio no encontrado" });
    }

    // 4. Get payment history (last 12 entries)
    const { data: payments, error: payErr } = await supabaseAdmin
      .from("payment_history")
      .select(
        "id, amount_paid, currency, status, invoice_url, period_start, period_end, created_at"
      )
      .eq("business_id", profile.business_id)
      .order("created_at", { ascending: false })
      .limit(12);

    if (payErr) {
      console.error("Error fetching payment history:", payErr);
    }

    return jsonResponse(200, {
      monthly_price: business.monthly_price,
      subscription_status: business.subscription_status ?? "none",
      current_period_end: business.current_period_end,
      has_payment_method: !!business.stripe_customer_id,
      has_subscription: !!business.stripe_subscription_id,
      payment_history: payments ?? [],
    });
  } catch (err) {
    console.error("Error in stripe-billing-info:", err);
    return jsonResponse(500, { error: "Error interno. Inténtalo de nuevo." });
  }
});
