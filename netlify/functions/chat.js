// netlify/functions/chat.js
// Node 18+ (global fetch)

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
const json = (status, body) => ({
  statusCode: status,
  headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS_HEADERS };
  if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" });

  // ✅ 1) الطريقة الموصى بها: من متغير بيئة
  let apiKey = process.env.OPENAI_API_KEY;

  // ⚠️ 2) للطوارئ/الاختبار فقط (محليًا): ألصق مفتاحك بين علامتي الاقتباس أدناه،
  // وتأكد ألا ترفعه للريبو أو تنشره. احذف السطر قبل أي نشر عام.
  if (!apiKey) {
    const HARDCODED = "PASTE_YOUR_OPENAI_KEY_HERE"; // ← ضع المفتاح مؤقتًا هنا إن لزمك
    if (HARDCODED && HARDCODED !== "PASTE_YOUR_OPENAI_KEY_HERE") {
      apiKey = HARDCODED;
    }
  }

  if (!apiKey) {
    return json(500, { error: "Missing OPENAI_API_KEY. Use Netlify env vars or set HARDCODED for local test only." });
  }

  let payload;
  try { payload = JSON.parse(event.body || "{}"); }
  catch { return json(400, { error: "Invalid JSON body" }); }

  const userMessage = (payload.message || "").trim();
  if (!userMessage) return json(400, { error: 'Missing "message" field' });

  const requestBody = {
    model: "gpt-4o-mini",            // بدّلها لو حسابك لا يدعم
    temperature: 0.2,
    max_tokens: 600,
    messages: [
      {
        role: "system",
        content:
          "أنت مساعد تقني ودود يجيب بالعربية المبسطة ويعطي خطوات عملية مختصرة عند الحاجة."
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
        // ملاحظة: إن كنت تستخدم Project API Keys وقد يتطلب ترويسة المشروع:
        // ...(process.env.OPENAI_PROJECT && { "OpenAI-Project": process.env.OPENAI_PROJECT })
      },
      body: JSON.stringify(requestBody)
    });

    const text = await resp.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text || null }; }

    if (!resp.ok) {
      return json(resp.status || 500, {
        error: "OpenAI API error",
        status: resp.status,
        details: data
      });
    }

    const reply =
      data?.choices?.[0]?.message?.content?.trim?.() ??
      data?.choices?.[0]?.text?.trim?.();

    if (!reply) return json(502, { error: "No completion returned from OpenAI", details: data });

    return json(200, { reply });
  } catch (err) {
    return json(500, { error: err.message || String(err) });
  }
};
