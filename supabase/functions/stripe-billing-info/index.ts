import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getAllowedOrigin(req: Request): string {
  const allowed = (Deno.env.get("FRONTEND_URL") || "http://localhost:5173").replace(/\/$/, "");
  const origin = req.headers.get("Origin") || "";
  return origin === allowed ? allowed : "";
}

function corsHeaders(req: Request) {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(req),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
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
  internal: string;
}> = {
  es: {
    authRequired: "Token de autorización requerido",
    sessionExpired: "Sesión expirada. Inicia sesión de nuevo.",
    profileNotFound: "No se encontró tu perfil de usuario",
    noPermission: "No tienes permisos para ver la facturación",
    internal: "Error interno. Inténtalo de nuevo.",
  },
  en: {
    authRequired: "Authorisation token required",
    sessionExpired: "Your session has expired. Please sign in again.",
    profileNotFound: "Your user profile could not be found",
    noPermission: "You don't have permission to view billing",
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

    // 3. Get business billing data
    const { data: business, error: bizErr } = await supabaseAdmin
      .from("businesses")
      .select(
        "plan_type, monthly_price, subscription_status, current_period_end, stripe_customer_id, stripe_subscription_id"
      )
      .eq("id", profile.business_id)
      .single();

    if (bizErr || !business) {
      return jsonResponse(404, { error: "Negocio no encontrado" }, req);
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
      plan_type: business.plan_type ?? "paid",
      monthly_price: business.monthly_price,
      subscription_status: business.subscription_status ?? "none",
      current_period_end: business.current_period_end,
      has_payment_method: !!business.stripe_customer_id,
      has_subscription: !!business.stripe_subscription_id,
      payment_history: payments ?? [],
    }, req);
  } catch (err) {
    console.error("Error in stripe-billing-info:", err);
    return jsonResponse(500, { error: msg.internal }, req);
  }
});
