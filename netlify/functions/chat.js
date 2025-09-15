// netlify/functions/chat.js
// Node 18+ has global fetch

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function json(status, body) {
  return {
    statusCode: status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS_HEADERS };

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method Not Allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // أضف OPENAI_API_KEY في Netlify → Site settings → Build & deploy → Environment
    return json(500, { error: "Missing OPENAI_API_KEY environment variable" });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const userMessage = (payload.message || "").trim();
  if (!userMessage) {
    return json(400, { error: 'Missing "message" field' });
  }

  // طلب OpenAI Chat Completions
  // اختر الموديل المناسب لديك (مثال: gpt-4o-mini سريع واقتصادي)
  const requestBody = {
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: 600,
    messages: [
      {
        role: "system",
        content:
          "أنت مساعد تقني ودود يجيب دائماً بالعربية الفصحى المبسطة. قدّم إجابات عملية ومختصرة مع نقاط واضحة، " +
          "وإن اقتضى الأمر اذكر أمثلة كود قصيرة. إذا سُئلت عن 3CX/VoIP/شبكات، كن محدداً قدر الإمكان."
      },
      { role: "user", content: userMessage }
    ]
  };

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text || null }; }

    if (!resp.ok) {
      // نعيد تفاصيل مفيدة بدون تسريب أسرار
      return json(resp.status || 500, {
        error: "OpenAI API error",
        status: resp.status,
        details: data
      });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return json(502, { error: "No completion returned from OpenAI" });
    }

    return json(200, { reply });
  } catch (err) {
    return json(500, { error: err.message || String(err) });
  }
};
