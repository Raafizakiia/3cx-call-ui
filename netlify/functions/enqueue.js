// netlify/functions/enqueue.js
// Node 18+ has global fetch

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

// ⚠️ تنبيه: وجود السر هنا غير آمن إذا كان الريبو عاماً.
// استخدم متغيرات بيئة إن أمكن.
const CONFIG = {
  base: "https://strata.3cx.ae",
  clientId: "postmantest",
  clientSecret: "Fn9HWzfOwHjsTF2PbWMfQ1vqyHjMbT9w",
  fromExt: "327"
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS };
  }
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const { to } = JSON.parse(event.body || "{}");
    const dest = (to || "").trim();
    const ALLOWED = /^[0-9+*#]{2,32}$/;
    if (!ALLOWED.test(dest)) {
      return {
        statusCode: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ error: 'Invalid "to" value', to: dest })
      };
    }

    // 1) طلب التوكن من /connect/token
    console.log("[enqueue] requesting token @ /connect/token");
    const tokRes = await fetch(`${CONFIG.base}/connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CONFIG.clientId,
        client_secret: CONFIG.clientSecret,
        grant_type: "client_credentials"
      })
    });

    const tokText = await tokRes.text();
    let tokJson;
    try { tokJson = JSON.parse(tokText); } catch { tokJson = { raw: tokText || null }; }

    if (!tokRes.ok || !tokJson.access_token) {
      console.log("[enqueue] token failed", tokRes.status, tokJson);
      return {
        statusCode: tokRes.status || 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ step: "token", status: tokRes.status, response: tokJson })
      };
    }

    const accessToken = tokJson.access_token;

    // 2) تنفيذ المكالمة @ /callcontrol/{fromExt}/makecall
    console.log("[enqueue] calling makecall", CONFIG.fromExt, "->", dest);
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
    try { parsed = JSON.parse(bodyText); } catch { parsed = { raw: bodyText || null }; }

    const payload = {
      ok: callRes.ok,
      status: callRes.status,
      from: CONFIG.fromExt,
      to: dest,
      response: parsed
    };
    console.log("[enqueue] makecall result", payload);

    return {
      statusCode: callRes.status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    };

  } catch (err) {
    console.log("[enqueue] unhandled error", err);
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || String(err) })
    };
  }
};
