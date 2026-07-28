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

// Copy localizado del email de modificación. 'es' es el comportamiento histórico.
const COPY: Record<Language, {
  intlLocale: string;
  htmlTitle: string;
  headerTag: string;
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
}> = {
  es: {
    intlLocale: "es-ES",
    htmlTitle: "Cita Modificada",
    headerTag: "🔄 Tu cita ha sido modificada",
    hello: (name) => `Hola <strong>${name}</strong>,`,
    intro: "Te informamos de que tu reserva ha sido <strong>modificada</strong>. Estos son los detalles actualizados:",
    dateLabel: "Fecha",
    timeLabel: "Hora",
    serviceLabel: "Servicio",
    locationLabel: "📍 UBICACIÓN",
    mapsLink: "Ver en Google Maps →",
    importantStrong: "⚠️ Importante:",
    importantBody: "Si los nuevos detalles no te van bien, por favor cancela la cita con al menos 2 horas de antelación.",
    seeYou: "¡Te esperamos! 💈",
    cancelButton: "❌ Cancelar Reserva",
    allRightsReserved: "Todos los derechos reservados.",
    subject: (date, time) => `🔄 Tu cita ha sido modificada - ${date} a las ${time}`,
  },
  en: {
    intlLocale: "en-GB",
    htmlTitle: "Appointment Updated",
    headerTag: "🔄 Your appointment has been updated",
    hello: (name) => `Hi <strong>${name}</strong>,`,
    intro: "We're writing to let you know your booking has been <strong>updated</strong>. Here are the updated details:",
    dateLabel: "Date",
    timeLabel: "Time",
    serviceLabel: "Service",
    locationLabel: "📍 LOCATION",
    mapsLink: "View on Google Maps →",
    importantStrong: "⚠️ Please note:",
    importantBody: "If the new details don't work for you, please cancel the appointment at least 2 hours in advance.",
    seeYou: "See you soon! 💈",
    cancelButton: "❌ Cancel booking",
    allRightsReserved: "All rights reserved.",
    subject: (date, time) => `🔄 Your appointment has been updated - ${date} at ${time}`,
  },
};

interface ModificationPrevious {
  booking_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  service_name?: string | null;
  barber?: string | null;
}

interface ModificationPayload {
  booking_id: string;
  business_id: string;
  to_email: string;
  customer_name: string;
  service_name: string;     // current (new) value
  barber_name: string | null;
  booking_date: string;     // current (new) value
  start_time: string;       // current (new) value
  end_time: string | null;
  cancel_token: string | null;
  previous: ModificationPrevious | null;  // snapshot of OLD values
}

function formatDate(iso: string | null | undefined, intlLocale: string): string | null {
  if (!iso) return null;
  try {
    const dateObj = new Date(iso + "T00:00:00");
    return new Intl.DateTimeFormat(intlLocale, {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    }).format(dateObj);
  } catch {
    return null;
  }
}

function formatTime(t: string | null | undefined): string {
  if (!t) return "";
  return t.slice(0, 5);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      console.error("[send-modification-email] Missing RESEND_API_KEY");
      return jsonResponse({ ok: false, error: "Server configuration error" }, 500);
    }
    if (!EXTERNAL_URL || !EXTERNAL_KEY) {
      console.error("[send-modification-email] Missing external Supabase credentials");
      return jsonResponse({ ok: false, error: "Server configuration error" }, 500);
    }

    const payload: ModificationPayload = await req.json();

    if (!payload.business_id) {
      return jsonResponse({ ok: false, error: "Missing business_id" }, 400);
    }
    if (!payload.booking_id) {
      return jsonResponse({ ok: false, error: "Missing booking_id" }, 400);
    }
    if (!payload.to_email || !payload.customer_name || !payload.service_name || !payload.booking_date || !payload.start_time) {
      return jsonResponse({ ok: false, error: "Missing required fields" }, 400);
    }

    const supabase = createClient(EXTERNAL_URL, EXTERNAL_KEY);

    // ── IDEMPOTENCY: skip if this modification was already emailed ──
    const { data: existing } = await supabase
      .from("bookings")
      .select("modification_sent_at")
      .eq("id", payload.booking_id)
      .maybeSingle();

    if (existing?.modification_sent_at) {
      console.log("[send-modification-email] Skipped (already sent):", payload.booking_id);
      return jsonResponse({ ok: true, skipped: true, reason: "already_sent" });
    }

    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("business_name, address, location_url, email, phone, logo_url, contact_email, website, staff_terminology")
      .eq("id", payload.business_id)
      .single();

    if (bizError || !business) {
      console.error("[send-modification-email] Business lookup error:", bizError);
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
        console.warn("[send-modification-email] Language lookup failed, defaulting to 'es':", langError.message);
      } else {
        businessLanguage = (langRow as { language?: string } | null)?.language ?? null;
      }
    }

    const biz = { ...(business as BusinessInfo), language: businessLanguage };
    const language = resolveLanguage(biz.language);
    const copy = COPY[language];
    const staffTerms = resolveStaffTerms(biz.staff_terminology, language);
    console.log("[send-modification-email] Sending modification to:", payload.to_email, "| business:", biz.business_name, "| language:", language);

    // NEW values
    const newDate = formatDate(payload.booking_date, copy.intlLocale)!;
    const newStart = formatTime(payload.start_time);
    const newEnd = formatTime(payload.end_time);
    const newService = payload.service_name;
    const newBarber = payload.barber_name || staffTerms.yourStaff;

    // OLD values (may be missing if trigger payload was incomplete)
    const prev = payload.previous ?? {};
    const oldDate = formatDate(prev.booking_date, copy.intlLocale);
    const oldStart = formatTime(prev.start_time);
    const oldEnd = formatTime(prev.end_time);
    const oldService = prev.service_name;
    const oldBarber = prev.barber;

    const dateChanged    = !!oldDate && oldDate !== newDate;
    const timeChanged    = !!oldStart && oldStart !== newStart;
    const serviceChanged = !!oldService && oldService !== newService;
    const barberChanged  = !!oldBarber && oldBarber !== newBarber && oldBarber !== payload.barber_name;

    // Helper to render an "old → new" row when the field changed, else just the new value
    function diffRow(emoji: string, label: string, oldVal: string | null | undefined, newVal: string, changed: boolean) {
      if (changed && oldVal) {
        return `
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                          <span style="color: #999; font-size: 14px;">${emoji} ${label}</span><br>
                          <span style="color: #999; font-size: 14px; text-decoration: line-through;">${escapeHtml(oldVal)}</span><br>
                          <span style="color: #d4af37; font-size: 16px; font-weight: 700; text-transform: capitalize;">→ ${escapeHtml(newVal)}</span>
                        </td>
                      </tr>`;
      }
      return `
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                          <span style="color: #999; font-size: 14px;">${emoji} ${label}</span><br>
                          <span style="color: #333; font-size: 16px; font-weight: 600; text-transform: capitalize;">${escapeHtml(newVal)}</span>
                        </td>
                      </tr>`;
    }

    const dateRow    = diffRow("📅", copy.dateLabel,           oldDate,                                       newDate,                                       dateChanged);
    const timeRow    = diffRow("🕐", copy.timeLabel,  oldStart ? `${oldStart}${oldEnd ? ` - ${oldEnd}` : ""}` : null, `${newStart}${newEnd ? ` - ${newEnd}` : ""}`,   timeChanged);
    const serviceRow = diffRow("✂️", copy.serviceLabel,        oldService ?? null,                            newService,                                    serviceChanged);
    const barberRow  = diffRow("💈", staffTerms.singularCap,   oldBarber ?? null,                             newBarber,                                     barberChanged);

    const businessWebsite = biz.website?.replace(/\/+$/, "") ?? "";
    const cancelUrl = payload.cancel_token && businessWebsite
      ? `${businessWebsite}/cancelar?token=${payload.cancel_token}`
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
                ${copy.hello(escapeHtml(payload.customer_name))}
              </p>
              <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                ${copy.intro}
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${dateRow}
                      ${timeRow}
                      ${serviceRow}
                      ${barberRow}
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
        subject: copy.subject(newDate, newStart),
        html: emailHtml,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("[send-modification-email] Resend error:", result);
      return jsonResponse(
        { ok: false, error: result.message || "Failed to send email" },
        500,
      );
    }

    // Mark sent (AFTER Resend success)
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ modification_sent_at: new Date().toISOString() })
      .eq("id", payload.booking_id);
    if (updateError) {
      console.error("[send-modification-email] Failed to update modification_sent_at:", updateError);
    }

    console.log("[send-modification-email] Modification sent successfully:", result.id, "booking:", payload.booking_id);
    return jsonResponse({ ok: true, email_id: result.id });
  } catch (err) {
    console.error("[send-modification-email] Error:", err);
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
