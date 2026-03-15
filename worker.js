// FestMessenger — Cloudflare CORS Proxy Worker
//
// РАЗВЕРТЫВАНИЕ (5 минут, бесплатно):
// 1. dash.cloudflare.com → Workers & Pages → Create Worker
// 2. Вставь этот код → Deploy
// 3. Скопируй URL (https://xxx.workers.dev)
// 4. FestMessenger → Настройки → CORS прокси → вставь URL
//
// Бесплатно: 100 000 запросов/день

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors(request.headers.get('Origin')) });
    }

    const url = new URL(request.url);
    const target = url.searchParams.get('url');
    if (!target) return new Response('Missing ?url=', { status: 400 });

    // Allow only Yandex Disk
    const host = new URL(target).hostname;
    if (!host.includes('yandex')) return new Response('Forbidden', { status: 403 });

    const res = await fetch(target, {
      headers: { 'User-Agent': 'FestMessenger/1.0' },
      redirect: 'follow',
    });

    return new Response(res.body, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'application/json',
        'Cache-Control': 'no-store',
        ...cors(request.headers.get('Origin') || '*'),
      },
    });
  },
};

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
