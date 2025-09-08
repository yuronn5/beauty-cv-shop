export default async (request, context) => {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/admin')) return context.next();

  const user = Deno.env.get('ADMIN_BASIC_USER') || 'admin';
  const pass = Deno.env.get('ADMIN_BASIC_PASS'); // set in Netlify env
  if (!pass) {
    return new Response('Admin locked. Configure ADMIN_BASIC_PASS.', { status: 503 });
  }

  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Basic ')) {
    return new Response('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin"' }
    });
  }

  const [u, p] = atob(auth.slice(6)).split(':');
  const ok = (u === user) && (p === pass);
  if (!ok) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin"' }
    });
  }

  return context.next();
};
