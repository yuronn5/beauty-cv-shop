// netlify/functions/book.js
import { getStore } from '@netlify/blobs';

const WORK_START = 8, WORK_END = 20;
const SLOT_MINUTES = 15, SERVICE_DURATION = 45;

function parseTime(t){ const [h,m]=t.split(':').map(Number); return h*60+m; }
function toTime(min){ const h=Math.floor(min/60), m=min%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; }
function rangeTimes(startStr, dur = SERVICE_DURATION, step = SLOT_MINUTES){
  const start = parseTime(startStr);
  const end = Math.min(start + dur, WORK_END*60);
  const out = [];
  if (start >= WORK_START*60 && start < WORK_END*60) out.push(startStr);
  for (let t = Math.ceil(start/step)*step; t < end; t += step) {
    if (t >= WORK_START*60 && t < WORK_END*60) out.push(toTime(t));
  }
  return out;
}

export default async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const body = await req.json().catch(()=> ({}));
    const { date, time, name, phone, action } = body || {};
    if (!date) return Response.json({ error: 'date required' }, { status: 400 });

    const store = getStore({ name: 'bookings' });
    const day = (await store.get(date, { type: 'json' })) || { blocked: [], bookings: [] };
    const setDay = (obj) => store.set(date, JSON.stringify(obj));

    const adminKey = req.headers.get('x-admin-key');
    const isAdmin = adminKey && adminKey === process.env.ADMIN_KEY;

    // ADMIN: блок/розблок день
    if (action === 'block-day' && isAdmin) {
      const all = [];
      for (let h=WORK_START; h<WORK_END; h++) for (let m=0; m<60; m+=SLOT_MINUTES) all.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
      day.blocked = Array.from(new Set([...(day.blocked||[]), ...all])).sort();
      await setDay(day);
      return Response.json({ ok: true });
    }
    if (action === 'unblock-day' && isAdmin) {
      day.blocked = [];
      day.bookings = [];
      await setDay(day);
      return Response.json({ ok: true });
    }

    // Далі — блок/бронь інтервалу 45 хв
    if (!time) return Response.json({ error: 'time required' }, { status: 400 });

    const span = rangeTimes(time);
    const occupied = new Set([...(day.blocked||[]), ...day.bookings.flatMap(b => rangeTimes(b.time))]);
    const conflict = span.some(t => occupied.has(t));
    if (conflict) return Response.json({ error: 'conflict' }, { status: 409 });

    // чистий адмін-блок 45 хв
    if (isAdmin && action === 'admin-block') {
      day.blocked = Array.from(new Set([...(day.blocked||[]), ...span])).sort();
      await setDay(day);
      return Response.json({ ok: true });
    }

    // клієнтське бронювання (або адмін як клієнт)
    if (!name || !phone) return Response.json({ error: 'name & phone required' }, { status: 400 });

    day.bookings.push({ time, name, phone });
    day.blocked = Array.from(new Set([...(day.blocked||[]), ...span])).sort();

    await setDay(day);
    return Response.json({ ok: true });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server error' }), { status: 500 });
  }
}
