import { getStore } from '@netlify/blobs';

const noCache = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Vary': 'x-admin-key'
};

export default async (req) => {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    if (!date) return new Response(JSON.stringify({ error: 'date required' }), { status: 400, headers: noCache });

    const isAdmin = req.headers.get('x-admin-key') && req.headers.get('x-admin-key') === process.env.ADMIN_KEY;

    const store = getStore({ name: 'bookings' });
    const day = (await store.get(date, { type: 'json' })) || { blocked: [], bookings: [] };

    const safeBookings = isAdmin ? (day.bookings || []) : (day.bookings || []).map(b => ({ time: b.time, name: 'Зайнято' }));

    return new Response(JSON.stringify({ blocked: day.blocked || [], bookings: safeBookings }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...noCache }
    });
  } catch {
    return new Response(JSON.stringify({ error: 'server error' }), { status: 500, headers: noCache });
  }
}
