// netlify/edge-functions/admin-guard.js
const COOKIE_NAME = "admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 1 day

export default async (request, context) => {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/admin")) return context.next();

  const cookies = parseCookies(request.headers.get("cookie") || "");
  const session = cookies[COOKIE_NAME];
  if (session) {
    const ok = await verifySession(session);
    if (ok) return context.next();
  }

  const user = Deno.env.get("ADMIN_BASIC_USER") || "admin";
  const pass = Deno.env.get("ADMIN_BASIC_PASS");
  if (!pass) return new Response("Admin locked. Configure ADMIN_BASIC_PASS.", { status: 503 });

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

  const res = await context.next();
  const cookie = await buildSessionCookie(u);
  res.headers.append("Set-Cookie", cookie);
  return res;
};

// helpers (без змін)
function parseCookies(str){ return str.split(/;\s*/).reduce((a,kv)=>{ const [k,...r]=kv.split("="); if(!k) return a; a[k]=decodeURIComponent(r.join("=")||""); return a; },{}); }
async function buildSessionCookie(username){
  const exp = Date.now() + COOKIE_MAX_AGE * 1000;
  const payload = `${username}|${exp}`;
  const sig = await sign(payload);
  const value = `${b64url(payload)}.${sig}`;
  return `${COOKIE_NAME}=${value}; Path=/admin; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}
async function verifySession(token){
  const [payloadB64,sig]=token.split("."); if(!payloadB64||!sig) return false;
  const payload=b64urlDecode(payloadB64); const [username,expStr]=payload.split("|");
  const exp=Number(expStr); if(!username||!Number.isFinite(exp)||Date.now()>exp) return false;
  const expected=await sign(payload); return timingSafeEqual(sig,expected);
}
function timingSafeEqual(a,b){ if(a.length!==b.length) return false; let out=0; for(let i=0;i<a.length;i++) out|=a.charCodeAt(i)^b.charCodeAt(i); return out===0; }
function b64url(i){ return btoa(i).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,""); }
function b64urlDecode(i){ i=i.replace(/-/g,"+").replace(/_/g,"/"); while(i.length%4) i+="="; return atob(i); }
async function sign(data){
  const secret = Deno.env.get("ADMIN_SESSION_SECRET") || "";
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name:"HMAC", hash:"SHA-256" }, false, ["sign"]);
  const buf = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return b64url(String.fromCharCode(...new Uint8Array(buf)));
}
