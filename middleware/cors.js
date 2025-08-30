// Configuración simplificada de CORS
export function corsMiddleware(req, res, next) {
  const allowedOrigins = [
    'http://localhost:3000',
    'https://admin-panel-three-lilac.vercel.app',
    'https://admin-panel-tawny-seven.vercel.app'
  ];
  const origin = req.headers.origin;

  // Permitir el origen si está en la lista o usar el primero como fallback
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[1]); // Usar el de producción como fallback
  }

  // Configuración común para todos los endpoints
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Manejar las solicitudes OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
}
