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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Extract JWT from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(401, { error: "Token de autorización requerido" });
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
        error: "Sesión expirada. Inicia sesión de nuevo.",
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
        error: "No se encontró tu perfil de usuario",
      });
    }

    if (!["owner", "admin"].includes(callerProfile.role)) {
      return jsonResponse(403, {
        error: "No tienes permisos para crear usuarios",
      });
    }

    // 5. Parse and validate request body
    const body = await req.json();
    const { name, email, password, role, phone, bio, business_id } = body;

    if (!name?.trim() || !email?.trim() || !password) {
      return jsonResponse(400, {
        error: "Faltan campos obligatorios: nombre, email y contraseña",
      });
    }

    if (password.length < 6) {
      return jsonResponse(400, {
        error: "La contraseña debe tener al menos 6 caracteres",
      });
    }

    if (!["barber", "admin"].includes(role)) {
      return jsonResponse(400, {
        error: "El rol debe ser 'barber' o 'admin'",
      });
    }

    // Enforce business isolation: admin can only create users in their own business
    if (business_id !== callerProfile.business_id) {
      return jsonResponse(403, {
        error: "No puedes crear usuarios en otro negocio",
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
      const msg = createAuthErr.message || "";
      if (
        msg.includes("already been registered") ||
        msg.includes("already exists")
      ) {
        return jsonResponse(409, {
          error: "Ya existe un usuario con ese email",
        });
      }
      if (msg.includes("password")) {
        return jsonResponse(400, {
          error: `Error en la contraseña: ${msg}`,
        });
      }
      console.error("Auth createUser error:", createAuthErr);
      return jsonResponse(500, {
        error: "No se pudo crear el usuario de autenticación",
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
          error: "Ya existe un usuario con ese email en el sistema",
        });
      }

      return jsonResponse(500, {
        error: "No se pudo crear el registro del usuario",
      });
    }

    // 8. Return created user
    return jsonResponse(201, { user: dbUser });
  } catch (err) {
    console.error("Unexpected error in create-barber:", err);
    return jsonResponse(500, { error: "Error interno. Inténtalo de nuevo." });
  }
});
