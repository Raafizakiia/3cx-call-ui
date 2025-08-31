// netlify/functions/enqueue.js
// Node 18+ has global fetch

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",        // لو تبي تقصرها على دومينك غيّرها
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS_HEADERS, body: "Method Not Allowed" };
  }

  try {
    const { to } = JSON.parse(event.body || "{}");

    // سماح بأرقام داخلية أو خارجية (E.164)، نجمة/هاش للسيناريوهات الخاصة
    const dest = (to || "").trim();
    const ALLOWED = /^[0-9+*#]{2,32}$/;
    if (!ALLOWED.test(dest)) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Invalid "to" value' })
      };
    }

    const base = process.env.THREEX_BASE;
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
    const fromExt = process.env.FROM_EXT || "327";

    if (!base || !clientId || !clientSecret) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Server not configured (env vars missing)" })
      };
    }

    // 1) احصل على التوكن (يُنتهي غالباً خلال 60–3600 ثانية؛ نجلبه كل مرة لتبسيط الأمور)
    const tokRes = await fetch(`${base}/connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials"
      })
    });

    if (!tokRes.ok) {
      const t = await tokRes.text();
      return {
        statusCode: tokRes.status,
        headers: CORS_HEADERS,
        body: JSON.stringify({ step: "token", status: tokRes.status, body: t })
      };
    }

    const tok = await tokRes.json();
    const accessToken = tok.access_token;

    // 2) نفّذ makecall من 327 إلى الرقم المطلوب
    const callRes = await fetch(`${base}/callcontrol/${fromExt}/makecall`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ destination: dest, timeout: 30 })
    });

const bodyText = await callRes.text();
let parsed;
try {
  parsed = JSON.parse(bodyText);
} catch {
  parsed = { raw: bodyText || null }; // ← null إذا فاضي
}

return {
  statusCode: callRes.status,
  headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  body: JSON.stringify({
    ok: callRes.ok,
    status: callRes.status,
    destination: dest,
    response: parsed
  })
};

};
