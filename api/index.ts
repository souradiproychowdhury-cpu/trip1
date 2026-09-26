import app from '../wandor_temp/server';

export default function handler(req: any, res: any) {
  const invokePath = req.headers['x-invoke-path'] || req.headers['x-matched-path'] || req.headers['x-forwarded-url'];
  if (invokePath && typeof invokePath === 'string') {
    const cleanPath = invokePath.split('?')[0];
    if (cleanPath && cleanPath !== '/' && cleanPath !== '/api' && (req.url === '/' || req.url === '/api' || req.url.startsWith('/api?'))) {
      req.url = cleanPath;
    }
  }
  return app(req, res);
}
