import app from '../server';

export default function handler(req: any, res: any) {
  // 1. Check if Vercel rewritten endpoint passed via query param __endpoint
  if (req.url) {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      const endpoint = parsed.searchParams.get('__endpoint');
      if (endpoint) {
        parsed.searchParams.delete('__endpoint');
        const search = parsed.search; // includes '?' if query params exist
        req.url = `/api/${endpoint}${search}`;
      }
    } catch {
      // Ignore URL parsing fallback
    }
  }

  // 2. Check header-based routing if req.url is still generic root or /api
  if (req.url === '/' || req.url === '/api' || req.url === '/api/' || req.url.startsWith('/api?')) {
    const routeMatch = req.headers['x-now-route-matches'];
    if (typeof routeMatch === 'string') {
      const match = routeMatch.match(/1=([^&]+)/);
      if (match && match[1]) {
        const decoded = decodeURIComponent(match[1]);
        const search = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
        req.url = `/api/${decoded}${search}`;
      }
    } else if (req.headers['x-forwarded-uri'] && req.headers['x-forwarded-uri'] !== '/api') {
      req.url = req.headers['x-forwarded-uri'];
    } else if (req.headers['x-invoke-path'] && req.headers['x-invoke-path'] !== '/api') {
      req.url = req.headers['x-invoke-path'];
    }
  }

  return app(req, res);
}
