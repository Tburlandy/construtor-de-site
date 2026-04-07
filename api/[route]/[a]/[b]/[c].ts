import app from '../../../../studio-server.js';

export default function handler(req: { url?: string }, res: unknown) {
  if (typeof req.url === 'string' && !req.url.startsWith('/api/')) {
    req.url = req.url.startsWith('/') ? `/api${req.url}` : `/api/${req.url}`;
  }
  return app(req as never, res as never);
}
