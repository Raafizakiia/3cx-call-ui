// netlify/functions/enqueue.js
// Node 18+ has global fetch

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

// ✨ ضع القيم هنا مباشرة
const CONFIG = {
  base: "https://strata.3cx.ae",   // THREEX_BASE
  clientId: "postmantest",         // CLIENT_ID
  clientSecret: "Fn9HWzfOwHjsTF2PbWMfQ1vqyHjMbT9w", // CLIENT_SECRET
  fromExt: "327"                   // FROM_EXT
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
    const dest = (to || "").trim();
    const ALLOWED = /^[0-9+*#]{2,32}$/;
    if (!ALLOWED.test(dest)) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Invalid "to" value' })
      };
    }

    // 1) الحصول على Access Token
    const tokRes = await fetch(`${CONFIG.base}/connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CONFIG.clientId,
        client_secret: CONFIG.clientSecret,
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

    // 2) تنفيذ makecall
    const callRes = await fetch(`${CONFIG.base}/callcontrol/${CONFIG.fromExt}/makecall`, {
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
      parsed = { raw: bodyText || null };
    }

    return {
      statusCode: callRes.status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: callRes.ok,
        status: callRes.status,
        from: CONFIG.fromExt,
        to: dest,
        response: parsed
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: err.message || String(err) })
    };
  }
};
