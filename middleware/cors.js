export function corsMiddleware(req, res, next) {
  const allowedOrigins = [
    'http://localhost:3000',
    'https://admin-panel-three-lilac.vercel.app',
    'https://admin-panel-tawny-seven.vercel.app'
  ];
  const origin = req.headers.origin;

  // Always set CORS headers
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development') {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://admin-panel-three-lilac.vercel.app');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
}
