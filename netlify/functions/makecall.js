// netlify/functions/makecall.js
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { to } = JSON.parse(event.body || '{}');
  if (!to) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing extension' }) };
  }

  const job = {
    id: Date.now().toString(),
    to
  };

  try {
    const r = await fetch(process.env.UPSTASH_URL + "/lpush/callqueue", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify([JSON.stringify(job)])
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true, job }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
}
