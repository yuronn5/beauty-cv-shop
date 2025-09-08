// netlify/edge-functions/admin-guard.js
// Guard для /admin.html та /admin*
// Працює так:
// - Якщо є валідний cookie admin_session → пускає без Basic Auth
// - Якщо ні → вимагає Basic Auth (логін/пароль з ENV)
// - При успішному логіні ставить cookie на 1 день

const COOKIE_NAME = "admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 1 day

export default async (request, context) => {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/admin")) return context.next();

  // 1) Якщо вже є cookie — перевіряємо
  const cookies = parseCookies(request.headers.get("cookie") || "");
  const session = cookies[COOKIE_NAME];
  if (session) {
    const ok = await verifySession(session).catch(() => false);
    if (ok) return context.next();
  }

  // 2) Перевіряємо Basic Auth
  const user = Deno.env.get("ADMIN_BASIC_USER") || "admin";
  const pass = Deno.env.get("ADMIN_BASIC_PASS");
  if (!pass) {
    return new Response("Admin locked. Configure ADMIN_BASIC_PASS.", { status: 503 });
  }

  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Basic ")) {
    return new Response("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Admin"' }
    });
  }

  const [u, p] = atob(auth.slice(6)).split(":");
  const ok = (u === user) && (p === pass);
  if (!ok) {
    return new Response("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Admin"' }
    });
  }

  // 3) Логін успішний → ставимо cookie (якщо є секрет)
  const res = await context.next();
  const secret = Deno.env.get("ADMIN_SESSION_SECRET") || "";
  if (secret.length >= 16) {
    const cookie = await buildSessionCookie(u);
    res.headers.append("Set-Cookie", cookie);
  }
  return res;
};

// ---------- helpers ----------

function parseCookies(str) {
  return str.split(/;\s*/).reduce((acc, kv) => {
    const [k, ...rest] = kv.split("=");
    if (!k) return acc;
    acc[k] = decodeURIComponent(rest.join("=") || "");
    return acc;
  }, {});
}

async function buildSessionCookie(username) {
  const exp = Date.now() + COOKIE_MAX_AGE * 1000;
  const payload = `${username}|${exp}`;
  const sig = await sign(payload);
  const value = `${b64url(payload)}.${sig}`;
  return `${COOKIE_NAME}=${value}; Path=/admin; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}

async function verifySession(token) {
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return false;
  const payload = b64urlDecode(payloadB64);
  const [username, expStr] = payload.split("|");
  const exp = Number(expStr);
  if (!username || !Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = await sign(payload);
  return timingSafeEqual(sig, expected);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function b64url(input) {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function b64urlDecode(input) {
  input = input.replace(/-/g, "+").replace(/_/g, "/");
  while (input.length % 4) input += "=";
  return atob(input);
}

async function sign(data) {
  const secret = Deno.env.get("ADMIN_SESSION_SECRET") || "";
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is missing");
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return b64url(String.fromCharCode(...new Uint8Array(sigBuf)));
}
