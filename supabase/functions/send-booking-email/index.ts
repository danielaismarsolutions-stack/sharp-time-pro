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

// Copy localizado del email de confirmación. 'es' es el comportamiento histórico.
const COPY: Record<Language, {
  intlLocale: string;
  headerTag: string;
  htmlTitle: string;
  hello: (name: string) => string;
  intro: string;
  dateLabel: string;
  timeLabel: string;
  serviceLabel: string;
  locationLabel: string;
  mapsLink: string;
  importantStrong: string;
  importantBody: string;
  seeYou: string;
  cancelButton: string;
  allRightsReserved: string;
  subject: (date: string, time: string) => string;
  textIntro: string;
  textCancel: (url: string) => string;
  textSeeYou: string;
  textLocationLabel: string;
  textDateLabel: string;
  textTimeLabel: string;
  textServiceLabel: string;
}> = {
  es: {
    intlLocale: "es-ES",
    headerTag: "Confirmación de Reserva",
    htmlTitle: "Confirmación de Reserva",
    hello: (name) => `Hola <strong>${name}</strong>,`,
    intro: "Tu reserva ha sido confirmada. Aquí están los detalles:",
    dateLabel: "📅 Fecha",
    timeLabel: "🕐 Hora",
    serviceLabel: "✂️ Servicio",
    locationLabel: "📍 UBICACIÓN",
    mapsLink: "Ver en Google Maps →",
    importantStrong: "⚠️ Importante:",
    importantBody: "Si no puedes asistir, por favor cancela tu cita con al menos 2 horas de antelación.",
    seeYou: "¡Te esperamos! 💈",
    cancelButton: "❌ Cancelar Reserva",
    allRightsReserved: "Todos los derechos reservados.",
    subject: (date, time) => `✅ Reserva confirmada - ${date} a las ${time}`,
    textIntro: "Tu reserva ha sido confirmada. Aquí están los detalles:",
    textCancel: (url) => `Si no puedes asistir, cancela tu reserva aquí: ${url}`,
    textSeeYou: "¡Te esperamos!",
    textLocationLabel: "Ubicación",
    textDateLabel: "Fecha",
    textTimeLabel: "Hora",
    textServiceLabel: "Servicio",
  },
  en: {
    intlLocale: "en-GB",
    headerTag: "Booking Confirmation",
    htmlTitle: "Booking Confirmation",
    hello: (name) => `Hi <strong>${name}</strong>,`,
    intro: "Your booking is confirmed. Here are the details:",
    dateLabel: "📅 Date",
    timeLabel: "🕐 Time",
    serviceLabel: "✂️ Service",
    locationLabel: "📍 LOCATION",
    mapsLink: "View on Google Maps →",
    importantStrong: "⚠️ Please note:",
    importantBody: "If you can't make it, please cancel your appointment at least 2 hours in advance.",
    seeYou: "See you soon! 💈",
    cancelButton: "❌ Cancel booking",
    allRightsReserved: "All rights reserved.",
    subject: (date, time) => `✅ Booking confirmed - ${date} at ${time}`,
    textIntro: "Your booking is confirmed. Here are the details:",
    textCancel: (url) => `If you can't make it, cancel your booking here: ${url}`,
    textSeeYou: "See you soon!",
    textLocationLabel: "Location",
    textDateLabel: "Date",
    textTimeLabel: "Time",
    textServiceLabel: "Service",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    if (!RESEND_API_KEY) {
      console.error("[send-booking-email] Missing RESEND_API_KEY");
      return jsonResponse({ ok: false, error: "Server configuration error" }, 500);
    }
    if (!EXTERNAL_URL || !EXTERNAL_KEY) {
      console.error("[send-booking-email] Missing external Supabase credentials");
      return jsonResponse({ ok: false, error: "Server configuration error" }, 500);
    }
    const {
      booking_id,
      business_id,
      to_email,
      customer_name,
      service_name,
      barber_name,
      booking_date,
      start_time,
      end_time,
      cancel_token,
    } = await req.json();
    if (!business_id) {
      return jsonResponse({ ok: false, error: "Missing business_id" }, 400);
    }
    if (!to_email || !customer_name || !service_name || !booking_date || !start_time) {
      return jsonResponse({ ok: false, error: "Missing required fields" }, 400);
    }
    const supabase = createClient(EXTERNAL_URL, EXTERNAL_KEY);

    // ── IDEMPOTENCY: skip if confirmation already sent for this booking ──
    if (booking_id) {
      const { data: existing } = await supabase
        .from("bookings")
        .select("confirmation_sent_at")
        .eq("id", booking_id)
        .maybeSingle();

      if (existing?.confirmation_sent_at) {
        console.log("[send-booking-email] Skipped (already sent):", booking_id);
        return jsonResponse({ ok: true, skipped: true, reason: "already_sent" });
      }
    }

    // NOTE: si la columna language aún no existe, el select con ella fallaría;
    // por eso se consulta por separado y se degrada a 'es' sin romper el envío.
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("business_name, address, location_url, email, phone, logo_url, contact_email, website, staff_terminology")
      .eq("id", business_id)
      .single();
    if (bizError || !business) {
      console.error("[send-booking-email] Business lookup error:", bizError);
      return jsonResponse({ ok: false, error: "Business not found" }, 404);
    }
    let businessLanguage: string | null = null;
    {
      const { data: langRow, error: langError } = await supabase
        .from("businesses")
        .select("language")
        .eq("id", business_id)
        .maybeSingle();
      if (langError) {
        console.warn("[send-booking-email] Language lookup failed, defaulting to 'es':", langError.message);
      } else {
        businessLanguage = (langRow as { language?: string } | null)?.language ?? null;
      }
    }
    const biz = { ...(business as BusinessInfo), language: businessLanguage };
    const language = resolveLanguage(biz.language);
    const copy = COPY[language];
    const staffTerms = resolveStaffTerms(biz.staff_terminology, language);
    console.log("[send-booking-email] Sending to:", to_email, "business:", biz.business_name, "language:", language);
    const dateObj = new Date(booking_date + "T00:00:00");
    const formattedDate = new Intl.DateTimeFormat(copy.intlLocale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(dateObj);
    const startFormatted = start_time.slice(0, 5);
    const endFormatted = end_time?.slice(0, 5) || "";
    const businessWebsite = biz.website?.replace(/\/+$/, "") ?? "";
    const cancelUrl = cancel_token && businessWebsite
      ? `${businessWebsite}/cancelar?token=${cancel_token}`
      : "";
    const locationHtml = biz.address
      ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-radius: 12px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="color: #d4af37; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">
                      ${copy.locationLabel}
                    </p>
                    <p style="color: #ffffff; font-size: 16px; margin: 0; line-height: 1.5;">
                      ${escapeHtml(biz.business_name)}<br>
                      ${escapeHtml(biz.address)}${biz.location_url ? `<br><a href="${escapeHtml(biz.location_url)}" style="color: #d4af37; text-decoration: none;">${copy.mapsLink}</a>` : ""}
                    </p>
                  </td>
                </tr>
              </table>`
      : "";
    const cancelButtonHtml = cancelUrl
      ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                <tr>
                  <td align="center">
                    <a href="${cancelUrl}" style="display: inline-block; background-color: #dc3545; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                      ${copy.cancelButton}
                    </a>
                  </td>
                </tr>
              </table>`
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
                ${copy.hello(escapeHtml(customer_name))}
              </p>
              <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                ${copy.intro}
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                          <span style="color: #999; font-size: 14px;">${copy.dateLabel}</span><br>
                          <span style="color: #333; font-size: 16px; font-weight: 600; text-transform: capitalize;">${formattedDate}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                          <span style="color: #999; font-size: 14px;">${copy.timeLabel}</span><br>
                          <span style="color: #333; font-size: 16px; font-weight: 600;">${startFormatted}${endFormatted ? ` - ${endFormatted}` : ""}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                          <span style="color: #999; font-size: 14px;">${copy.serviceLabel}</span><br>
                          <span style="color: #333; font-size: 16px; font-weight: 600;">${escapeHtml(service_name)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0;">
                          <span style="color: #999; font-size: 14px;">💈 ${staffTerms.singularCap}</span><br>
                          <span style="color: #333; font-size: 16px; font-weight: 600;">${escapeHtml(barber_name || staffTerms.yourStaff)}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ${locationHtml}
              <div style="background-color: #fff8e6; border-left: 4px solid #d4af37; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 30px;">
                <p style="color: #333; font-size: 14px; margin: 0; line-height: 1.6;">
                  <strong>${copy.importantStrong}</strong> ${copy.importantBody}
                </p>
              </div>
              <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                ${copy.seeYou}
              </p>
              ${cancelButtonHtml}
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
    // Plain-text version (mejora la entregabilidad: los filtros antispam penalizan HTML sin parte de texto)
    const greeting = language === "en" ? `Hi ${customer_name},` : `Hola ${customer_name},`;
    const emailText = [
      greeting,
      ``,
      copy.textIntro,
      ``,
      `${copy.textDateLabel}: ${formattedDate}`,
      `${copy.textTimeLabel}: ${startFormatted}${endFormatted ? ` - ${endFormatted}` : ""}`,
      `${copy.textServiceLabel}: ${service_name}`,
      `${staffTerms.singularCap}: ${barber_name || staffTerms.yourStaff}`,
      ...(biz.address ? [``, `${copy.textLocationLabel}: ${biz.business_name}, ${biz.address}`] : []),
      ...(cancelUrl ? [``, copy.textCancel(cancelUrl)] : []),
      ``,
      copy.textSeeYou,
      biz.business_name,
    ].join("\n");

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
        to: [to_email],
        subject: copy.subject(formattedDate, startFormatted),
        html: emailHtml,
        text: emailText,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("[send-booking-email] Resend error:", result);
      return jsonResponse(
        { ok: false, error: result.message || "Failed to send email" },
        500,
      );
    }

    // ── Mark confirmation as sent (AFTER successful Resend send) ──
    if (booking_id) {
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ confirmation_sent_at: new Date().toISOString() })
        .eq("id", booking_id);

      if (updateError) {
        console.error("[send-booking-email] Failed to update confirmation_sent_at:", updateError);
        // Don't fail the response — email was already sent
      }
    }

    console.log("[send-booking-email] Email sent successfully:", result.id, "booking:", booking_id);
    return jsonResponse({ ok: true, email_id: result.id });
  } catch (err) {
    console.error("[send-booking-email] Error:", err);
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
