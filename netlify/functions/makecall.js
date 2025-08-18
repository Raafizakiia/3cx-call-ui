export async function handler(event) {
  // CORS (اختياري)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*' } };
  }

  // Health (GET)
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*' },
      body: JSON.stringify({ ok: true, msg: 'health-only' })
    };
  }

  // Dummy (POST) — يرجع فورًا بدون أي اتصالات خارجية
  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body || '{}');
    return {
      statusCode: 200,
      headers: { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*' },
      body: JSON.stringify({ ok: true, received: body })
    };
  }

  return { statusCode: 405, body: 'Method not allowed' };
}
