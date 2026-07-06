import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, apikey, x-client-info, authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const EXTERNAL_URL = Deno.env.get("EXTERNAL_SUPABASE_URL") ?? "";
const EXTERNAL_KEY = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY") ?? "";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface BusinessInfo {
  business_name: string;
  address: string | null;
  location_url: string | null;
  email: string;
  phone: string | null;
  logo_url: string | null;
  contact_email: string | null;
  website: string | null;
  staff_terminology: string | null;
}

type StaffTerminology = 'barberos' | 'estilistas';

function resolveStaffTerms(value: string | null | undefined): { singularCap: string; singular: string } {
  const term: StaffTerminology = value === 'estilistas' ? 'estilistas' : 'barberos';
  return term === 'estilistas'
    ? { singularCap: 'Estilista', singular: 'estilista' }
    : { singularCap: 'Barbero', singular: 'barbero' };
}

interface ReminderPayload {
  booking_id: string;
  business_id: string;
  to_email: string;
  customer_name: string;
  service_name: string;
  barber_name: string | null;
  booking_date: string;
  start_time: string;
  end_time: string | null;
  cancel_token: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      console.error("[send-reminder-email] Missing RESEND_API_KEY");
      return jsonResponse({ ok: false, error: "Server configuration error" }, 500);
    }
    if (!EXTERNAL_URL || !EXTERNAL_KEY) {
      console.error("[send-reminder-email] Missing external Supabase credentials");
      return jsonResponse({ ok: false, error: "Server configuration error" }, 500);
    }

    const payload: ReminderPayload = await req.json();

    if (!payload.business_id) {
      return jsonResponse({ ok: false, error: "Missing business_id" }, 400);
    }
    if (!payload.to_email || !payload.customer_name || !payload.service_name || !payload.booking_date || !payload.start_time) {
      return jsonResponse({ ok: false, error: "Missing required fields" }, 400);
    }

    const supabase = createClient(EXTERNAL_URL, EXTERNAL_KEY);

    // ── IDEMPOTENCY: skip if reminder already sent or booking no longer confirmed ──
    if (payload.booking_id) {
      const { data: existing } = await supabase
        .from("bookings")
        .select("reminder_sent_at, status")
        .eq("id", payload.booking_id)
        .maybeSingle();

      if (existing?.reminder_sent_at) {
        console.log("[send-reminder-email] Skipped (already sent):", payload.booking_id);
        return jsonResponse({ ok: true, skipped: true, reason: "already_sent" });
      }
      if (existing && existing.status !== "confirmed") {
        console.log("[send-reminder-email] Skipped (status:", existing.status, "):", payload.booking_id);
        return jsonResponse({ ok: true, skipped: true, reason: "not_confirmed" });
      }
    }

    // Fetch business details
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("business_name, address, location_url, email, phone, logo_url, contact_email, website, staff_terminology")
      .eq("id", payload.business_id)
      .single();

    if (bizError || !business) {
      console.error("[send-reminder-email] Business lookup error:", bizError);
      return jsonResponse({ ok: false, error: "Business not found" }, 404);
    }

    const biz = business as BusinessInfo;
    const staffTerms = resolveStaffTerms(biz.staff_terminology);
    console.log("[send-reminder-email] Sending reminder to:", payload.to_email, "business:", biz.business_name);

    // Format date
    const dateObj = new Date(payload.booking_date + "T00:00:00");
    const formattedDate = new Intl.DateTimeFormat("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(dateObj);

    const startFormatted = payload.start_time.slice(0, 5);
    const endFormatted = payload.end_time?.slice(0, 5) || "";

    // Cancel URL
    const businessWebsite = biz.website?.replace(/\/+$/, "") ?? "";
    const cancelUrl = payload.cancel_token && businessWebsite
      ? `${businessWebsite}/cancelar?token=${payload.cancel_token}`
      : "";

    // Location block
    const locationHtml = biz.address
      ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-radius: 12px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="color: #d4af37; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">
                      📍 UBICACIÓN
                    </p>
                    <p style="color: #ffffff; font-size: 16px; margin: 0; line-height: 1.5;">
                      ${escapeHtml(biz.business_name)}<br>
                      ${escapeHtml(biz.address)}${biz.location_url ? `<br><a href="${escapeHtml(biz.location_url)}" style="color: #d4af37; text-decoration: none;">Ver en Google Maps →</a>` : ""}
                    </p>
                  </td>
                </tr>
              </table>`
      : "";

    // Cancel button
    const cancelButtonHtml = cancelUrl
      ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                <tr>
                  <td align="center">
                    <a href="${cancelUrl}" style="display: inline-block; background-color: #dc3545; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                      ❌ Cancelar Reserva
                    </a>
                  </td>
                </tr>
              </table>`
      : "";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recordatorio de Cita</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 40px 40px; text-align: center;">
              <h1 style="color: #d4af37; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px;">
                ✨ ${escapeHtml(biz.business_name.toUpperCase())}
              </h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">
                ⏰ Recordatorio de Cita
              </p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #333; font-size: 18px; margin: 0 0 20px 0;">
                Hola <strong>${escapeHtml(payload.customer_name)}</strong>,
              </p>
              <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Te recordamos que tienes una cita programada. Aquí están los detalles:
              </p>
              <!-- Booking Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                          <span style="color: #999; font-size: 14px;">📅 Fecha</span><br>
                          <span style="color: #333; font-size: 16px; font-weight: 600; text-transform: capitalize;">${formattedDate}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                          <span style="color: #999; font-size: 14px;">🕐 Hora</span><br>
                          <span style="color: #333; font-size: 16px; font-weight: 600;">${startFormatted}${endFormatted ? ` - ${endFormatted}` : ""}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                          <span style="color: #999; font-size: 14px;">✂️ Servicio</span><br>
                          <span style="color: #333; font-size: 16px; font-weight: 600;">${escapeHtml(payload.service_name)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0;">
                          <span style="color: #999; font-size: 14px;">💈 ${staffTerms.singularCap}</span><br>
                          <span style="color: #333; font-size: 16px; font-weight: 600;">${escapeHtml(payload.barber_name || `Tu ${staffTerms.singular}`)}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ${locationHtml}
              <!-- Important Notes -->
              <div style="background-color: #fff8e6; border-left: 4px solid #d4af37; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 30px;">
                <p style="color: #333; font-size: 14px; margin: 0; line-height: 1.6;">
                  <strong>⚠️ Importante:</strong> Si no puedes asistir, por favor cancela tu cita con antelación.
                </p>
              </div>
              <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                ¡Te esperamos! 💈
              </p>
              ${cancelButtonHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} ${escapeHtml(biz.business_name)}. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Plain-text version (mejora la entregabilidad: los filtros antispam penalizan HTML sin parte de texto)
    const emailText = [
      `Hola ${payload.customer_name},`,
      ``,
      `Te recordamos que tienes una cita programada:`,
      ``,
      `Fecha: ${formattedDate}`,
      `Hora: ${startFormatted}${endFormatted ? ` - ${endFormatted}` : ""}`,
      `Servicio: ${payload.service_name}`,
      `${staffTerms.singularCap}: ${payload.barber_name || `Tu ${staffTerms.singular}`}`,
      ...(biz.address ? [``, `Ubicación: ${biz.business_name}, ${biz.address}`] : []),
      ...(cancelUrl ? [``, `Si no puedes asistir, cancela tu cita aquí: ${cancelUrl}`] : []),
      ``,
      `¡Te esperamos!`,
      biz.business_name,
    ].join("\n");

    // Send email via Resend
    const senderName = biz.business_name;
    const replyTo = biz.contact_email || biz.email || "";
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${senderName} <claudia@smartflow-labs.com>`,
        ...(replyTo ? { reply_to: [replyTo] } : {}),
        to: [payload.to_email],
        subject: `⏰ Recordatorio de tu cita - ${formattedDate} a las ${startFormatted}`,
        html: emailHtml,
        text: emailText,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("[send-reminder-email] Resend error:", result);
      return jsonResponse(
        { ok: false, error: result.message || "Failed to send email" },
        500,
      );
    }

    // Mark reminder as sent (AFTER successful Resend send).
    // El cron reintenta hasta 5 veces mientras reminder_sent_at siga NULL.
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", payload.booking_id);

    if (updateError) {
      console.error("[send-reminder-email] Failed to update reminder_sent_at:", updateError);
      // Don't fail the response — email was already sent
    }

    console.log("[send-reminder-email] Reminder sent successfully:", result.id, "booking:", payload.booking_id);
    return jsonResponse({ ok: true, email_id: result.id });
  } catch (err) {
    console.error("[send-reminder-email] Error:", err);
    return jsonResponse({ ok: false, error: "Internal server error" }, 500);
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
