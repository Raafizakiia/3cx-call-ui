// netlify/functions/makecall.js
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { to } = JSON.parse(event.body || '{}');
    if (!to) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing extension "to"' }) };
    }

    // نبني المهمة
    const job = {
      id: Date.now().toString(),
      to: String(to).trim()
    };

    // LPUSH callqueue "<json>"
    const url = `${process.env.UPSTASH_REDIS_REST_URL}/lpush/callqueue`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      // ملاحظة: Upstash REST يأخذ مصفوفة Args
      body: JSON.stringify([JSON.stringify(job)])
    });

    const data = await res.json();
    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ ok: false, upstash: data }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, job, upstash: data }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
}
