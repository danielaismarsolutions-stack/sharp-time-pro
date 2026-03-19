import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const VAPID_SUBJECT = "mailto:admin@riojabarberstudio.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Convert URL-safe base64 to Uint8Array
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Convert Uint8Array to URL-safe base64
function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Import VAPID private key as CryptoKey for ES256 signing
async function importVapidPrivateKey(base64Url: string): Promise<CryptoKey> {
  const rawKey = base64UrlToUint8Array(base64Url);
  // ES256 private key is 32 bytes raw, need to wrap in JWK
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: base64Url,
    // We need to derive x,y from the public key, but we'll import using PKCS8 instead
    // Actually for ECDSA, we need to use JWK format with the public key components
  };

  // Import raw private key bytes by constructing a proper JWK
  // We need the public key to create a full JWK, so let's use a different approach:
  // Generate the VAPID Authorization header using the private key
  return await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      d: base64Url,
      x: Deno.env.get("VAPID_PUBLIC_KEY_X")!,
      y: Deno.env.get("VAPID_PUBLIC_KEY_Y")!,
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

// Create VAPID Authorization header (JWT signed with ES256)
async function createVapidAuthHeader(
  endpoint: string,
  privateKeyBase64Url: string
): Promise<{ authorization: string; cryptoKey: string }> {
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  // Create JWT header and payload
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
    sub: VAPID_SUBJECT,
  };

  const encodedHeader = uint8ArrayToBase64Url(
    new TextEncoder().encode(JSON.stringify(header))
  );
  const encodedPayload = uint8ArrayToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload))
  );

  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Sign with ECDSA P-256 (ES256)
  const privateKey = await importVapidPrivateKey(privateKeyBase64Url);
  const signatureBuffer = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format for JWT
  const signature = uint8ArrayToBase64Url(new Uint8Array(signatureBuffer));
  const jwt = `${unsignedToken}.${signature}`;

  return {
    authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    cryptoKey: vapidPublicKey,
  };
}

// Encrypt push message payload using Web Push encryption (aes128gcm)
async function encryptPayload(
  payload: string,
  p256dhBase64: string,
  authBase64: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const p256dh = base64UrlToUint8Array(p256dhBase64);
  const auth = base64UrlToUint8Array(authBase64);

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  // Export local public key (uncompressed point)
  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  // Import subscriber's public key
  const subscriberKey = await crypto.subtle.importKey(
    "raw",
    p256dh,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: subscriberKey },
      localKeyPair.privateKey,
      256
    )
  );

  // Generate 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF to derive encryption key and nonce
  // Step 1: auth_info = "WebPush: info\0" + subscriber_key + local_key
  const authInfo = new Uint8Array([
    ...new TextEncoder().encode("WebPush: info\0"),
    ...p256dh,
    ...localPublicKeyRaw,
  ]);

  // Import shared secret for HKDF
  const ikm = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, [
    "deriveBits",
  ]);

  // PRK = HKDF-Extract(auth, shared_secret)
  const prk = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: auth, info: authInfo },
    ikm,
    256
  );

  const prkKey = await crypto.subtle.importKey("raw", prk, "HKDF", false, [
    "deriveBits",
  ]);

  // Content encryption key (CEK) = HKDF-Expand(PRK, "Content-Encoding: aes128gcm\0", 16)
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const cek = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: salt, info: cekInfo },
    prkKey,
    128
  );

  // Nonce = HKDF-Expand(PRK, "Content-Encoding: nonce\0", 12)
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");
  const nonce = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: salt, info: nonceInfo },
    prkKey,
    96
  );

  // Encrypt with AES-128-GCM
  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, [
    "encrypt",
  ]);

  // Pad the plaintext with a delimiter byte (0x02 for final record)
  const paddedPayload = new Uint8Array([
    ...new TextEncoder().encode(payload),
    2, // delimiter for final record
  ]);

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce, tagLength: 128 },
      aesKey,
      paddedPayload
    )
  );

  // Build aes128gcm content: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const rs = 4096;
  const header2 = new Uint8Array([
    ...salt,
    (rs >> 24) & 0xff,
    (rs >> 16) & 0xff,
    (rs >> 8) & 0xff,
    rs & 0xff,
    localPublicKeyRaw.length,
    ...localPublicKeyRaw,
  ]);

  const encrypted = new Uint8Array([...header2, ...ciphertext]);

  return { encrypted, salt, localPublicKey: localPublicKeyRaw };
}

// Send a push notification to a single subscription
async function sendPushToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string }
): Promise<boolean> {
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

  try {
    // Create VAPID authorization header
    const { authorization } = await createVapidAuthHeader(
      subscription.endpoint,
      vapidPrivateKey
    );

    // Encrypt the payload
    const payloadString = JSON.stringify(payload);
    const { encrypted } = await encryptPayload(
      payloadString,
      subscription.p256dh,
      subscription.auth
    );

    // Send the push message
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "86400",
        Urgency: "high",
      },
      body: encrypted,
    });

    if (response.status === 201 || response.status === 200) {
      return true;
    }

    // 404 or 410 means subscription is expired — clean it up
    if (response.status === 404 || response.status === 410) {
      console.log(`Subscription expired, should remove: ${subscription.endpoint}`);
    } else {
      console.error(`Push failed with status ${response.status}: ${await response.text()}`);
    }

    return false;
  } catch (err) {
    console.error(`Error sending push to ${subscription.endpoint}:`, err);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id, title, message, url } = await req.json();

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: "user_id and title are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with service role key to bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch push subscriptions for this user
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (error) {
      console.error("Error fetching subscriptions:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch subscriptions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No push subscriptions found for user", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send push to all subscriptions
    const payload = { title, body: message || "", url: url || "/" };
    const results = await Promise.allSettled(
      subscriptions.map((sub) => sendPushToSubscription(sub, payload))
    );

    const sent = results.filter(
      (r) => r.status === "fulfilled" && r.value === true
    ).length;

    // Clean up expired subscriptions (404/410)
    const expiredEndpoints = subscriptions.filter((_, i) => {
      const r = results[i];
      return r.status === "fulfilled" && r.value === false;
    });

    if (expiredEndpoints.length > 0) {
      for (const sub of expiredEndpoints) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Push sent to ${sent}/${subscriptions.length} subscriptions`,
        sent,
        total: subscriptions.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
