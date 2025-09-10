// --- CONFIG ---
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/ID/TOKEN";

function safeStringify(obj) {
  try { return JSON.stringify(obj, null, 2); } catch (e) { return String(obj); }
}
const statusEl = () => document.getElementById('status');
const outputEl = () => document.getElementById('output');
const btn = document.getElementById('logBtn');

function collectClientInfo() {
  return {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent || null,
    language: navigator.language || null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    screen: (screen && screen.width && screen.height) ? `${screen.width}x${screen.height}` : null,
    platform: navigator.platform || null,
  };
}

async function fetchGeo() {
  const url = 'https://ipapi.co/json/';
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Geo API error: ' + res.status);
  return await res.json();
}

async function sendToDiscord(payload) {
  if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes('ID/TOKEN')) {
    console.warn('Discord webhook not set.');
    return { skipped: true };
  }
  const body = {
    content: '```json\n' + safeStringify(payload) + '\n```'
  };
  const res = await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('Webhook error ' + res.status);
  return { success: true };
}

btn.addEventListener('click', async () => {
  btn.disabled = true;
  statusEl().textContent = 'Collecting...';
  try {
    const client = collectClientInfo();
    statusEl().textContent = 'Fetching IP & geo...';
    let geo = {};
    try {
      geo = await fetchGeo();
    } catch (e) {
      console.warn('Geo failed:', e);
      geo = { ip: 'unknown', city: 'unknown', country: 'unknown' };
    }
    const full = { ...client, ...geo };
    outputEl().textContent = safeStringify(full);
    statusEl().textContent = 'Sending to Discord...';
    try {
      const res = await sendToDiscord(full);
      statusEl().textContent = res.skipped ? 'Webhook not set.' : 'Sent to Discord.';
    } catch (err) {
      statusEl().textContent = 'Discord send failed.';
    }
  } catch (err) {
    outputEl().textContent = 'Error: ' + err.message;
    statusEl().textContent = 'Error.';
  } finally {
    btn.disabled = false;
  }
});