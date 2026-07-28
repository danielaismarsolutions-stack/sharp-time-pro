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
  language: string | null;
}

type StaffTerminology = 'barberos' | 'estilistas';
type Language = 'es' | 'en';

function resolveLanguage(value: string | null | undefined): Language {
  return value === 'en' ? 'en' : 'es';
}

function resolveStaffTerms(
  value: string | null | undefined,
  language: Language,
): { singularCap: string; yourStaff: string } {
  const term: StaffTerminology = value === 'estilistas' ? 'estilistas' : 'barberos';
  if (language === 'en') {
    return term === 'estilistas'
      ? { singularCap: 'Stylist', yourStaff: 'Your stylist' }
      : { singularCap: 'Barber', yourStaff: 'Your barber' };
  }
  return term === 'estilistas'
    ? { singularCap: 'Estilista', yourStaff: 'Tu estilista' }
    : { singularCap: 'Barbero', yourStaff: 'Tu barbero' };
}

// Copy localizado del email de cancelación. 'es' es el comportamiento histórico.
const COPY: Record<Language, {
  intlLocale: string;
  htmlTitle: string;
  headerTag: string;
  hello: (name: string) => string;
  intro: string;
  dateLabel: string;
  timeLabel: string;
  serviceLabel: string;
  needHelp: string;
  seeYou: string;
  newBookingButton: string;
  allRightsReserved: string;
  subject: (date: string, time: string) => string;
}> = {
  es: {
    intlLocale: "es-ES",
    htmlTitle: "Reserva Cancelada",
    headerTag: "❌ Reserva cancelada",
    hello: (name) => `Hola <strong>${name}</strong>,`,
    intro: "Confirmamos que tu reserva ha sido <strong>cancelada</strong>. Estos eran los detalles:",
    dateLabel: "📅 Fecha",
    timeLabel: "🕐 Hora",
    serviceLabel: "✂️ Servicio",
    needHelp: "¿Necesitas ayuda?",
    seeYou: "Esperamos verte pronto de nuevo. 💈",
    newBookingButton: "📅 Reservar nueva cita",
    allRightsReserved: "Todos los derechos reservados.",
    subject: (date, time) => `❌ Reserva cancelada - ${date} a las ${time}`,
  },
  en: {
    intlLocale: "en-GB",
    htmlTitle: "Booking Cancelled",
    headerTag: "❌ Booking cancelled",
    hello: (name) => `Hi <strong>${name}</strong>,`,
    intro: "We confirm that your booking has been <strong>cancelled</strong>. These were the details:",
    dateLabel: "📅 Date",
    timeLabel: "🕐 Time",
    serviceLabel: "✂️ Service",
    needHelp: "Need help?",
    seeYou: "We hope to see you again soon. 💈",
    newBookingButton: "📅 Book a new appointment",
    allRightsReserved: "All rights reserved.",
    subject: (date, time) => `❌ Booking cancelled - ${date} at ${time}`,
  },
};

interface CancellationPayload {
  // Exactly one of these MUST be provided:
  booking_id?: string;   // bookings row still exists (cancelled via cancel link or admin status change)
  outbox_id?: string;    // bookings row was deleted; data is in booking_cancellation_outbox
  business_id: string;
  to_email: string;
  customer_name: string;
  service_name: string;
  barber_name: string | null;
  booking_date: string;
  start_time: string;
  end_time: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      console.error("[send-cancellation-email] Missing RESEND_API_KEY");
      return jsonResponse({ ok: false, error: "Server configuration error" }, 500);
    }
    if (!EXTERNAL_URL || !EXTERNAL_KEY) {
      console.error("[send-cancellation-email] Missing external Supabase credentials");
      return jsonResponse({ ok: false, error: "Server configuration error" }, 500);
    }

    const payload: CancellationPayload = await req.json();

    if (!payload.business_id) {
      return jsonResponse({ ok: false, error: "Missing business_id" }, 400);
    }
    if (!payload.to_email || !payload.customer_name || !payload.service_name || !payload.booking_date || !payload.start_time) {
      return jsonResponse({ ok: false, error: "Missing required fields" }, 400);
    }
    if (!payload.booking_id && !payload.outbox_id) {
      return jsonResponse({ ok: false, error: "Either booking_id or outbox_id is required" }, 400);
    }

    const supabase = createClient(EXTERNAL_URL, EXTERNAL_KEY);

    // ── IDEMPOTENCY: skip if this cancellation email was already sent ──
    if (payload.outbox_id) {
      const { data: existing } = await supabase
        .from("booking_cancellation_outbox")
        .select("sent_at")
        .eq("id", payload.outbox_id)
        .maybeSingle();
      if (existing?.sent_at) {
        console.log("[send-cancellation-email] Skipped outbox (already sent):", payload.outbox_id);
        return jsonResponse({ ok: true, skipped: true, reason: "already_sent" });
      }
    } else if (payload.booking_id) {
      const { data: existing } = await supabase
        .from("bookings")
        .select("cancellation_sent_at")
        .eq("id", payload.booking_id)
        .maybeSingle();
      if (existing?.cancellation_sent_at) {
        console.log("[send-cancellation-email] Skipped booking (already sent):", payload.booking_id);
        return jsonResponse({ ok: true, skipped: true, reason: "already_sent" });
      }
    }

    // Fetch business details
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("business_name, address, location_url, email, phone, logo_url, contact_email, website, staff_terminology")
      .eq("id", payload.business_id)
      .single();

    if (bizError || !business) {
      console.error("[send-cancellation-email] Business lookup error:", bizError);
      return jsonResponse({ ok: false, error: "Business not found" }, 404);
    }

    // NOTE: si la columna language aún no existe, el select con ella fallaría;
    // por eso se consulta por separado y se degrada a 'es' sin romper el envío.
    let businessLanguage: string | null = null;
    {
      const { data: langRow, error: langError } = await supabase
        .from("businesses")
        .select("language")
        .eq("id", payload.business_id)
        .maybeSingle();
      if (langError) {
        console.warn("[send-cancellation-email] Language lookup failed, defaulting to 'es':", langError.message);
      } else {
        businessLanguage = (langRow as { language?: string } | null)?.language ?? null;
      }
    }

    const biz = { ...(business as BusinessInfo), language: businessLanguage };
    const language = resolveLanguage(biz.language);
    const copy = COPY[language];
    const staffTerms = resolveStaffTerms(biz.staff_terminology, language);
    console.log(
      "[send-cancellation-email] Sending cancellation to:", payload.to_email,
      "| business:", biz.business_name,
      "| source:", payload.outbox_id ? "outbox" : "booking",
      "| language:", language,
    );

    const dateObj = new Date(payload.booking_date + "T00:00:00");
    const formattedDate = new Intl.DateTimeFormat(copy.intlLocale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(dateObj);

    const startFormatted = payload.start_time.slice(0, 5);
    const endFormatted = payload.end_time?.slice(0, 5) || "";

    const businessWebsite = biz.website?.replace(/\/+$/, "") ?? "";
    const newBookingUrl = businessWebsite ? `${businessWebsite}/reservar` : "";

    const newBookingButtonHtml = newBookingUrl
      ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                <tr>
                  <td align="center">
                    <a href="${newBookingUrl}" style="display: inline-block; background-color: #d4af37; color: #1a1a1a; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                      ${copy.newBookingButton}
                    </a>
                  </td>
                </tr>
              </table>`
      : "";

    const contactHtml = biz.phone || biz.contact_email
      ? `
              <div style="background-color: #f0f4f8; border-left: 4px solid #4a90e2; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 30px;">
                <p style="color: #333; font-size: 14px; margin: 0 0 8px 0; line-height: 1.6;">
                  <strong>${copy.needHelp}</strong>
                </p>
                <p style="color: #555; font-size: 14px; margin: 0; line-height: 1.6;">
                  ${biz.phone ? `📞 ${escapeHtml(biz.phone)}` : ""}
                  ${biz.phone && biz.contact_email ? " · " : ""}
                  ${biz.contact_email ? `✉️ ${escapeHtml(biz.contact_email)}` : ""}
                </p>
              </div>`
      : "";

    const emailHtml = `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${copy.htmlTitle}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 40px 40px; text-align: center;">
              <h1 style="color: #d4af37; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px;">
                ✨ ${escapeHtml(biz.business_name.toUpperCase())}
              </h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">
                ${copy.headerTag}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="color: #333; font-size: 18px; margin: 0 0 20px 0;">
                ${copy.hello(escapeHtml(payload.customer_name))}
              </p>
              <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                ${copy.intro}
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border-radius: 12px; padding: 24px; margin-bottom: 30px; opacity: 0.85;">
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                          <span style="color: #999; font-size: 14px;">${copy.dateLabel}</span><br>
                          <span style="color: #333; font-size: 16px; font-weight: 600; text-decoration: line-through; text-transform: capitalize;">${formattedDate}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                          <span style="color: #999; font-size: 14px;">${copy.timeLabel}</span><br>
                          <span style="color: #333; font-size: 16px; font-weight: 600; text-decoration: line-through;">${startFormatted}${endFormatted ? ` - ${endFormatted}` : ""}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                          <span style="color: #999; font-size: 14px;">${copy.serviceLabel}</span><br>
                          <span style="color: #333; font-size: 16px; font-weight: 600; text-decoration: line-through;">${escapeHtml(payload.service_name)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0;">
                          <span style="color: #999; font-size: 14px;">💈 ${staffTerms.singularCap}</span><br>
                          <span style="color: #333; font-size: 16px; font-weight: 600; text-decoration: line-through;">${escapeHtml(payload.barber_name || staffTerms.yourStaff)}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ${contactHtml}
              <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                ${copy.seeYou}
              </p>
              ${newBookingButtonHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} ${escapeHtml(biz.business_name)}. ${copy.allRightsReserved}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const senderName = biz.business_name;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${senderName} <claudia@smartflow-labs.com>`,
        to: [payload.to_email],
        subject: copy.subject(formattedDate, startFormatted),
        html: emailHtml,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("[send-cancellation-email] Resend error:", result);
      return jsonResponse(
        { ok: false, error: result.message || "Failed to send email" },
        500,
      );
    }

    // ── Mark the right tracker as sent (AFTER successful Resend send) ──
    if (payload.outbox_id) {
      const { error: updateError } = await supabase
        .from("booking_cancellation_outbox")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", payload.outbox_id);
      if (updateError) {
        console.error("[send-cancellation-email] Failed to update outbox sent_at:", updateError);
      }
    } else if (payload.booking_id) {
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ cancellation_sent_at: new Date().toISOString() })
        .eq("id", payload.booking_id);
      if (updateError) {
        console.error("[send-cancellation-email] Failed to update bookings cancellation_sent_at:", updateError);
      }
    }

    console.log(
      "[send-cancellation-email] Cancellation sent successfully:", result.id,
      "| booking:", payload.booking_id ?? "(deleted)",
      "| outbox:", payload.outbox_id ?? "(n/a)",
    );
    return jsonResponse({ ok: true, email_id: result.id });
  } catch (err) {
    console.error("[send-cancellation-email] Error:", err);
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
