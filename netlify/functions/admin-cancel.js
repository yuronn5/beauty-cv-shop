// netlify/functions/admin-cancel.js
import { getStore } from '@netlify/blobs';

const WORK_START = 8, WORK_END = 20;
const SLOT_MINUTES = 15, SERVICE_DURATION = 45;

const noCache = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Vary': 'x-admin-key'
};

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
async function notifyTelegram(text){
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat  = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ chat_id: chat, text })
  }).catch(()=>null);
}

export default async (req) => {
  try{
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: noCache });
    const key = req.headers.get('x-admin-key');
    if (!key || key !== process.env.ADMIN_KEY) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: noCache });
    }

    const { date, time } = await req.json().catch(()=> ({}));
    if (!date || !time) {
      return new Response(JSON.stringify({ error: 'date & time required' }), { status: 400, headers: noCache });
    }

    const store = getStore({ name: 'bookings' });
    const day = (await store.get(date, { type: 'json' })) || { blocked: [], bookings: [] };
    const before = JSON.stringify(day);

    // remove booking at time
    const idx = (day.bookings||[]).findIndex(b => b.time === time);
    if (idx === -1) {
      return new Response(JSON.stringify({ error: 'booking not found' }), { status: 404, headers: noCache });
    }
    const removed = day.bookings.splice(idx,1)[0];

    // unblock its 45-min span
    const span = rangeTimes(time);
    day.blocked = (day.blocked||[]).filter(t => !span.includes(t));

    await store.set(date, JSON.stringify(day));

    // Telegram notify (optional)
    await notifyTelegram(`❌ BOOKING CANCELED by admin\nDate: ${date}\nTime: ${time}\nName: ${removed?.name||''}\nPhone: ${removed?.phone||''}`);

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: noCache });
  }catch(e){
    return new Response(JSON.stringify({ error: 'server error' }), { status: 500, headers: noCache });
  }
}
