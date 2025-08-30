// Configuración robusta de CORS
export function corsMiddleware(req, res, next) {
  // Solo permitir el origen específico de Vercel
  const allowedOrigin = 'https://admin-panel-three-lilac.vercel.app';
  const origin = req.headers.origin;

  console.log('CORS Request from origin:', origin);
  console.log('Method:', req.method);
  console.log('URL:', req.url);

  // SIEMPRE establecer el header para el origen permitido
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Para solicitudes OPTIONS (preflight), responder inmediatamente
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return res.status(200).end();
  }

  // Verificar si el origen está permitido para solicitudes reales
  if (origin && origin !== allowedOrigin) {
    console.log('Origin not allowed:', origin);
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  next();
}
