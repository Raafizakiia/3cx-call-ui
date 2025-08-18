// Node 18+ on Netlify
export async function handler(event) {
    try {
      // Health check
      if (event.httpMethod === 'GET') {
        return resp(200, { ok: true, msg: 'makecall function ready' });
      }
  
      if (event.httpMethod !== 'POST') {
        return resp(405, { error: 'Method not allowed' });
      }
  
      const { PBX_URL, CLIENT_ID, CLIENT_SECRET, CALLER_EXT } = process.env;
      if (!PBX_URL || !CLIENT_ID || !CLIENT_SECRET || !CALLER_EXT) {
        return resp(500, { error: 'Missing envs PBX_URL / CLIENT_ID / CLIENT_SECRET / CALLER_EXT' });
      }
  
      // Parse input
      const body = JSON.parse(event.body || '{}');
      const to = String(body.to || '').trim();
  
      // Basic validation: only digits & 2–6 length (adjust as needed)
      if (!/^\d{2,6}$/.test(to)) {
        return resp(400, { error: 'Invalid extension' });
      }
  
      // 1) Get OAuth token from 3CX (v20)
      const tokenRes = await fetch(`${PBX_URL}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          scope: 'callcontrol'
        }),
      });
  
      if (!tokenRes.ok) {
        const t = await safeJson(tokenRes);
        return resp(tokenRes.status, { error: 'Auth failed', details: t });
      }
      const token = await tokenRes.json();
  
      // 2) Ask 3CX to make the call: from CALLER_EXT (327) to target ext (e.g., 201)
      // Endpoint name can vary slightly by build; this is the common shape in v20:
      const makeCallPayload = { from: CALLER_EXT, to };
      const makeCallRes = await fetch(`${PBX_URL}/api/callcontrol/makecall`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(makeCallPayload),
      });
  
      const resultBody = await safeJson(makeCallRes);
      if (!makeCallRes.ok) {
        return resp(makeCallRes.status, { error: 'makecall failed', details: resultBody });
      }
  
      return resp(200, { ok: true, placed: { from: CALLER_EXT, to }, api: resultBody });
    } catch (err) {
      return resp(500, { error: 'Unhandled', details: String(err) });
    }
  }
  
  // Helpers
  function resp(code, obj) {
    return {
      statusCode: code,
      headers: {
        'Content-Type': 'application/json',
        // allow your static site to call this function
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST,GET,OPTIONS'
      },
      body: JSON.stringify(obj)
    };
  }
  
  async function safeJson(res) {
    try { return await res.json(); } catch { return await res.text(); }
  }
  