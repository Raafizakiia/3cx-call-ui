// netlify/functions/enqueue.js
export async function handler(event) {
  const resp = (status, obj) => ({
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  });

  if (event.httpMethod === "GET") return resp(200, { ok: true, msg: "health" });
  if (event.httpMethod !== "POST") return resp(405, { error: "Method not allowed" });

  const { to } = JSON.parse(event.body || "{}");
  const value = String(to || "").trim();
  if (!value) return resp(400, { error: "to is required" });
  if (!/^\d{1,20}$/.test(value)) return resp(400, { error: "digits only" });

  const url = process.env.UPSTASH_URL;        // e.g. https://gusc1-magical-sheep-30294.upstash.io
  const token = process.env.UPSTASH_TOKEN;    // your Upstash REST token
  if (!url || !token) return resp(500, { error: "UPSTASH_URL / UPSTASH_TOKEN not set" });

  // RPUSH keeps FIFO order (append to the end of the list)
  const up = await fetch(`${url}/rpush/callqueue/${encodeURIComponent(value)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  const text = await up.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  if (!up.ok) return resp(up.status, { error: "Upstash error", detail: body });

  // Upstash returns {"result": <new length>}
  return resp(200, { ok: true, queued: value, upstash: body });
}
