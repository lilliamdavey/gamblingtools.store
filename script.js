async function getInfo() {
  const deviceInfo = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    cores: navigator.hardwareConcurrency || "unknown",
    memory: navigator.deviceMemory || "unknown",
    screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown"
  };

  try {
    const res = await fetch("https://ipapi.co/json/");
    if (!res.ok) throw new Error("ipapi request failed");
    const geo = await res.json();
    return { ...deviceInfo, ...geo };
  } catch (err) {
    console.warn("ipapi failed:", err);
    return { ...deviceInfo, ip: "unknown", city: "unknown", country: "unknown" };
  }
}

async function showInfo() {
  const info = await getInfo();
  document.getElementById("output").textContent = JSON.stringify(info, null, 2);

  document.getElementById("sendBtn").onclick = async () => {
    try {
      await fetch("YOUR_DISCORD_WEBHOOK_URL", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "```json\n" + JSON.stringify(info, null, 2) + "\n```" })
      });
      alert("Info sent to Discord!");
    } catch (err) {
      alert("Failed to send to Discord: " + err);
    }
  };
}

showInfo();