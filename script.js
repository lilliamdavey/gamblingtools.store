// Replace this with your own Discord webhook URL
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/XXXX/XXXX";

// Collect safe visitor info
const data = {
  userAgent: navigator.userAgent,
  language: navigator.language,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  screen: `${screen.width}x${screen.height}`,
  platform: navigator.platform
};

// Show it on the page
document.getElementById("output").textContent = JSON.stringify(data, null, 2);

// Send to Discord webhook
fetch(DISCORD_WEBHOOK_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    content: "**New Visitor Info (Demo):**\n```json\n" + JSON.stringify(data, null, 2) + "\n```"
  })
}).catch(err => console.error("Error sending to Discord:", err));
