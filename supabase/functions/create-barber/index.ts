import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Language = "es" | "en";

// El frontend envía ?lang=en|es (idioma del negocio). Sin parámetro → 'es'
// para mantener el comportamiento histórico.
function resolveLanguage(req: Request): Language {
  try {
    const lang = new URL(req.url).searchParams.get("lang");
    return lang === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

const MESSAGES: Record<Language, {
  authRequired: string;
  sessionExpired: string;
  profileNotFound: string;
  noPermission: string;
  missingFields: string;
  passwordTooShort: string;
  invalidRole: string;
  invalidColor: string;
  wrongBusiness: string;
  emailExists: string;
  passwordError: (msg: string) => string;
  authCreateFailed: string;
  dbEmailExists: string;
  dbCreateFailed: string;
  internal: string;
}> = {
  es: {
    authRequired: "Token de autorización requerido",
    sessionExpired: "Sesión expirada. Inicia sesión de nuevo.",
    profileNotFound: "No se encontró tu perfil de usuario",
    noPermission: "No tienes permisos para crear usuarios",
    missingFields: "Faltan campos obligatorios: nombre, email y contraseña",
    passwordTooShort: "La contraseña debe tener al menos 6 caracteres",
    invalidRole: "El rol debe ser 'barber' o 'admin'",
    invalidColor: "El color de cita debe ser un valor hexadecimal #RRGGBB",
    wrongBusiness: "No puedes crear usuarios en otro negocio",
    emailExists: "Ya existe un usuario con ese email",
    passwordError: (msg) => `Error en la contraseña: ${msg}`,
    authCreateFailed: "No se pudo crear el usuario de autenticación",
    dbEmailExists: "Ya existe un usuario con ese email en el sistema",
    dbCreateFailed: "No se pudo crear el registro del usuario",
    internal: "Error interno. Inténtalo de nuevo.",
  },
  en: {
    authRequired: "Authorisation token required",
    sessionExpired: "Your session has expired. Please sign in again.",
    profileNotFound: "Your user profile could not be found",
    noPermission: "You don't have permission to create users",
    missingFields: "Required fields missing: name, email and password",
    passwordTooShort: "The password must be at least 6 characters long",
    invalidRole: "The role must be 'barber' or 'admin'",
    invalidColor: "The appointment colour must be a #RRGGBB hex value",
    wrongBusiness: "You can't create users in another business",
    emailExists: "A user with that email already exists",
    passwordError: (msg) => `Password error: ${msg}`,
    authCreateFailed: "The authentication user could not be created",
    dbEmailExists: "A user with that email already exists in the system",
    dbCreateFailed: "The user record could not be created",
    internal: "Internal error. Please try again.",
  },
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const msg = MESSAGES[resolveLanguage(req)];

  try {
    // 1. Extract JWT from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(401, { error: msg.authRequired });
    }
    const token = authHeader.replace("Bearer ", "");

    // 2. Create admin Supabase client (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 3. Verify caller identity via JWT
    const {
      data: { user: authCaller },
      error: authErr,
    } = await supabaseAdmin.auth.getUser(token);

    if (authErr || !authCaller) {
      return jsonResponse(401, {
        error: msg.sessionExpired,
      });
    }

    // 4. Check caller role and get their business_id
    const { data: callerProfile, error: profileErr } = await supabaseAdmin
      .from("users")
      .select("role, business_id")
      .eq("auth_uid", authCaller.id)
      .single();

    if (profileErr || !callerProfile) {
      return jsonResponse(403, {
        error: msg.profileNotFound,
      });
    }

    const allowedRoles = ["owner", "admin"];
    if (!allowedRoles.includes(callerProfile.role)) {
      return jsonResponse(403, {
        error: msg.noPermission,
      });
    }

    // 5. Parse and validate request body
    const body = await req.json();
    const { name, email, password, role, phone, bio, appointment_color, business_id } = body;

    if (!name?.trim() || !email?.trim() || !password) {
      return jsonResponse(400, {
        error: msg.missingFields,
      });
    }

    if (password.length < 6) {
      return jsonResponse(400, {
        error: msg.passwordTooShort,
      });
    }

    const allowedNewRoles = ["barber", "admin"];
    if (!allowedNewRoles.includes(role)) {
      return jsonResponse(400, {
        error: msg.invalidRole,
      });
    }

    // Validate appointment_color (hex #RRGGBB) if provided
    let normalizedColor: string | null = null;
    if (appointment_color !== undefined && appointment_color !== null && appointment_color !== "") {
      if (typeof appointment_color !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(appointment_color)) {
        return jsonResponse(400, {
          error: msg.invalidColor,
        });
      }
      normalizedColor = appointment_color;
    }

    // Enforce business isolation: admin can only create users in their own business
    if (business_id !== callerProfile.business_id) {
      return jsonResponse(403, {
        error: msg.wrongBusiness,
      });
    }

    // 6. Create Auth user (email_confirm: true so they can log in immediately)
    const { data: newAuth, error: createAuthErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true,
      });

    if (createAuthErr) {
      const errMsg = createAuthErr.message || "";
      if (
        errMsg.includes("already been registered") ||
        errMsg.includes("already exists")
      ) {
        return jsonResponse(409, {
          error: msg.emailExists,
        });
      }
      if (errMsg.includes("password")) {
        return jsonResponse(400, {
          error: msg.passwordError(errMsg),
        });
      }
      console.error("Auth createUser error:", createAuthErr);
      return jsonResponse(500, {
        error: msg.authCreateFailed,
      });
    }

    // 7. Insert into users table with auth_uid linked
    const { data: dbUser, error: dbErr } = await supabaseAdmin
      .from("users")
      .insert({
        business_id,
        full_name: name.trim(),
        email: email.trim(),
        phone: phone || null,
        bio: bio || null,
        appointment_color: normalizedColor,
        role,
        auth_uid: newAuth.user.id,
        is_active: true,
      })
      .select()
      .single();

    if (dbErr) {
      // Rollback: delete the Auth user since DB insert failed
      console.error("DB insert error, rolling back auth user:", dbErr);
      try {
        await supabaseAdmin.auth.admin.deleteUser(newAuth.user.id);
      } catch (rollbackErr) {
        console.error(
          "Failed to rollback auth user:",
          newAuth.user.id,
          rollbackErr
        );
      }

      if (dbErr.code === "23505") {
        return jsonResponse(409, {
          error: msg.dbEmailExists,
        });
      }

      return jsonResponse(500, {
        error: msg.dbCreateFailed,
      });
    }

    // 8. Return created user
    return jsonResponse(201, { user: dbUser });
  } catch (err) {
    console.error("Unexpected error in create-barber:", err);
    return jsonResponse(500, { error: msg.internal });
  }
});
