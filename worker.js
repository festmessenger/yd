// FestMessenger — Cloudflare Worker (Full API Proxy)
// 
// УСТАНОВКА (5 минут, бесплатно):
// 1. dash.cloudflare.com → Workers & Pages → Create application → Create Worker
// 2. Замени весь код этим → Save and Deploy  
// 3. Скопируй URL вида: https://abc123.YOUR-NAME.workers.dev
// 4. В FestMessenger → Настройки → CORS прокси → вставь этот URL
//
// Бесплатный план: 100 000 запросов/день

const YD_API = 'https://cloud-api.yandex.net/v1/disk';

export default {
  async fetch(request) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return cors(new Response(null, { status: 204 }), request);
    }

    const url = new URL(request.url);
    const token = request.headers.get('X-Yandex-Token');
    const path = url.searchParams.get('path');

    if (!token) return cors(new Response('Missing X-Yandex-Token', { status: 401 }), request);

    const ydHeaders = {
      'Authorization': `OAuth ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      // GET /read?path=... → download file content
      if (url.pathname.endsWith('/read')) {
        if (!path) return cors(new Response('Missing path', { status: 400 }), request);
        // Get download URL
        const r1 = await fetch(`${YD_API}/resources/download?path=${encodeURIComponent(path)}`, { headers: ydHeaders });
        if (!r1.ok) return cors(new Response(null, { status: r1.status }), request);
        const { href } = await r1.json();
        // Download file
        const r2 = await fetch(href);
        const body = await r2.text();
        return cors(new Response(body, {
          status: r2.ok ? 200 : r2.status,
          headers: { 'Content-Type': 'application/json' },
        }), request);
      }

      // POST /write?path=... → upload file content
      if (url.pathname.endsWith('/write')) {
        if (!path) return cors(new Response('Missing path', { status: 400 }), request);
        const body = await request.text();
        // Get upload URL
        const r1 = await fetch(`${YD_API}/resources/upload?path=${encodeURIComponent(path)}&overwrite=true`, { headers: ydHeaders });
        if (!r1.ok) return cors(new Response(null, { status: r1.status }), request);
        const { href } = await r1.json();
        // Upload
        const r2 = await fetch(href, { method: 'PUT', body });
        return cors(new Response(null, { status: r2.ok || r2.status === 201 ? 200 : r2.status }), request);
      }

      // GET /list?path=... → list directory
      if (url.pathname.endsWith('/list')) {
        if (!path) return cors(new Response('Missing path', { status: 400 }), request);
        const r1 = await fetch(`${YD_API}/resources?path=${encodeURIComponent(path)}&limit=1000&sort=created`, { headers: ydHeaders });
        if (!r1.ok) return cors(new Response('[]', { status: r1.status, headers: {'Content-Type':'application/json'} }), request);
        const data = await r1.json();
        const items = data._embedded?.items || [];
        return cors(new Response(JSON.stringify({ items }), {
          headers: { 'Content-Type': 'application/json' },
        }), request);
      }

      // POST /mkdir?path=... → create directory
      if (url.pathname.endsWith('/mkdir')) {
        if (!path) return cors(new Response('Missing path', { status: 400 }), request);
        const r1 = await fetch(`${YD_API}/resources?path=${encodeURIComponent(path)}`, {
          method: 'PUT', headers: ydHeaders,
        });
        return cors(new Response(null, { status: r1.status === 409 ? 200 : r1.status }), request);
      }

      // DELETE /delete?path=... → delete file
      if (url.pathname.endsWith('/delete')) {
        if (!path) return cors(new Response('Missing path', { status: 400 }), request);
        const r1 = await fetch(`${YD_API}/resources?path=${encodeURIComponent(path)}&permanently=true`, {
          method: 'DELETE', headers: ydHeaders,
        });
        return cors(new Response(null, { status: r1.status }), request);
      }

      // GET /dlurl?path=... → get download URL for media files
      if (url.pathname.endsWith('/dlurl')) {
        if (!path) return cors(new Response('Missing path', { status: 400 }), request);
        const r1 = await fetch(`${YD_API}/resources/download?path=${encodeURIComponent(path)}`, { headers: ydHeaders });
        if (!r1.ok) return cors(new Response('null', { status: r1.status }), request);
        const { href } = await r1.json();
        return cors(new Response(JSON.stringify({ href }), {
          headers: { 'Content-Type': 'application/json' },
        }), request);
      }

      return cors(new Response('Unknown endpoint', { status: 404 }), request);

    } catch (err) {
      return cors(new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }), request);
    }
  },
};

function cors(response, request) {
  const origin = request?.headers?.get('Origin') || '*';
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Yandex-Token');
  return new Response(response.body, { status: response.status, headers });
}
