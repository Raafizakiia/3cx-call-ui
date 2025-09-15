// netlify/functions/chat.js
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS };
  }

  try {
    const { message } = JSON.parse(event.body || "{}");

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` // ضع مفتاحك هنا في إعدادات Netlify
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // أو gpt-3.5-turbo
        messages: [
          { role: "system", content: "أنت مساعد ودود يرد دائماً بالعربية." },
          { role: "user", content: message }
        ]
      })
    });

    const data = await resp.json();
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ reply: data.choices[0].message.content })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: err.message })
    };
  }
};
