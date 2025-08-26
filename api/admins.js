import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    // Verificar autenticación
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: "No autorizado" });
    }

    // Verificar token
    const JWT_SECRET = process.env.JWT_SECRET || "superclave123";
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: "Token inválido" });
    }

    // Importar Supabase dinámicamente
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

    // Obtener usuarios con rol admin
    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, email, phone, provincia, canton, distrito, created_at, role")
      .eq("role", "admin");

    if (error) {
      console.error("❌ Error obteniendo administradores:", error);
      return res.status(500).json({ error: "Error obteniendo administradores" });
    }

    // Transformar datos para que coincidan con el formato esperado en el frontend
    const admins = data.map(user => ({
      id: user.id,
      nombre: user.full_name,
      email: user.email,
      telefono: user.phone || '',
      rol: user.role || 'admin',
      provincia: user.provincia || '',
      canton: user.canton || '',
      distrito: user.distrito || '',
      fechaCreacion: user.created_at,
      activo: true // Por defecto todos están activos
    }));

    return res.status(200).json({ 
      success: true,
      data: admins
    });

  } catch (error) {
    console.error("❌ Error en API de administradores:", error);
    return res.status(500).json({ 
      error: "Error interno del servidor",
      details: error.message
    });
  }
}
