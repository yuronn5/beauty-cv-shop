// netlify/functions/availability.js
import { getStore } from '@netlify/blobs';

export default async (req) => {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get('date'); // YYYY-MM-DD
    if (!date) return new Response(JSON.stringify({ error: 'date required' }), { status: 400 });

    const isAdmin = req.headers.get('x-admin-key') && req.headers.get('x-admin-key') === process.env.ADMIN_KEY;

    const store = getStore({ name: 'bookings' });
    const day = (await store.get(date, { type: 'json' })) || { blocked: [], bookings: [] };

    const safeBookings = isAdmin
      ? (day.bookings || [])
      : (day.bookings || []).map(b => ({ time: b.time, name: 'Зайнято' })); // без телефону та імені

    return Response.json({ blocked: day.blocked || [], bookings: safeBookings });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server error' }), { status: 500 });
  }
}
