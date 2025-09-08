// netlify/functions/admin-list.js
import { getStore } from '@netlify/blobs';

const noCache = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Vary': 'x-admin-key'
};

function parseISO(s){ const d = new Date(s); if (Number.isNaN(d.getTime())) return null; return d; }
function toISO(d){ return d.toISOString().slice(0,10); }

export default async (req) => {
  try{
    const key = req.headers.get('x-admin-key');
    if (!key || key !== process.env.ADMIN_KEY) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: noCache });
    }

    const url = new URL(req.url);
    const start = parseISO(url.searchParams.get('start'));
    const end   = parseISO(url.searchParams.get('end'));
    if (!start || !end) {
      return new Response(JSON.stringify({ error: 'start & end (YYYY-MM-DD) required' }), { status: 400, headers: noCache });
    }

    // iterate dates inclusively
    const rows = [];
    const store = getStore({ name: 'bookings' });
    const cur = new Date(start);
    while (cur <= end) {
      const date = toISO(cur);
      const day = (await store.get(date, { type: 'json' })) || null;
      if (day && Array.isArray(day.bookings)) {
        for (const b of day.bookings) {
          rows.push({
            date,
            time: b.time,
            name: b.name || '',
            phone: b.phone || '',
            paid: !!b.paid,
            paymentId: b.paymentId || ''
          });
        }
      }
      cur.setDate(cur.getDate()+1);
    }

    return new Response(JSON.stringify({ rows }), {
      status: 200,
      headers: { 'Content-Type':'application/json', ...noCache }
    });
  }catch(e){
    return new Response(JSON.stringify({ error: 'server error' }), { status: 500, headers: noCache });
  }
}
