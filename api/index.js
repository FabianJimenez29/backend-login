export default function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.status(200).json({ 
    message: "Backend con Supabase funcionando 🚀", 
    status: "OK",
    timestamp: new Date().toISOString(),
    endpoints: {
      register: "/api/register",
      login: "/api/login"
    }
  });
}