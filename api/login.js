import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://admin-panel-three-lilac.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  try {
    console.log("🔐 Intento de login");
    console.log("Raw body:", req.body);

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      console.error("❌ Faltan variables de entorno de Supabase");
      return res.status(500).json({ error: "Error de configuración del servidor" });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } 
      catch { return res.status(400).json({ error: "JSON inválido" }); }
    }

    const { email, password } = body;
    if (!email || !password) return res.status(400).json({ error: "Completa todos los campos" });

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

    // Buscar el usuario por email - INCLUIR EL ROL EN LA CONSULTA
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      console.log("❌ Usuario no encontrado:", error);
      return res.status(400).json({ error: "Credenciales incorrectas" });
    }

    console.log("👤 Usuario encontrado:", { 
      id: user.id, 
      email: user.email, 
      role: user.role || 'sin_role' 
    });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      console.log("❌ Contraseña incorrecta");
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    // Obtener el rol del usuario (el campo en la BD se llama 'role')
    const userRole = user.role || 'user';
    console.log("🔑 Rol del usuario:", userRole);

    // Verificar si hay al menos un usuario admin en la base de datos
    const { data: admins, error: adminError } = await supabase
      .from("users")
      .select("id")
      .eq("role", "admin");

    if (adminError) {
      console.error("❌ Error al verificar admins:", adminError);
      return res.status(500).json({ error: "Error al verificar usuarios admin" });
    }

    const hasAdmin = admins && admins.length > 0;
    console.log("👑 Hay admins en la DB:", hasAdmin, "- Total admins:", admins?.length || 0);

    // Generar JWT incluyendo el rol
    const JWT_SECRET = process.env.JWT_SECRET || "superclave123";
    const token = jwt.sign({ 
      id: user.id, 
      email: user.email, 
      rol: userRole 
    }, JWT_SECRET, { expiresIn: "7d" });

    // Determinar el mensaje según el rol
    const isAdmin = userRole === "admin";
    const message = isAdmin ? "Login exitoso como administrador" : "Login exitoso";

    console.log("✅ Login exitoso:", { 
      userId: user.id, 
      email: user.email, 
      role: userRole,
      esAdmin: isAdmin
    });

    return res.status(200).json({
      message,
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        provincia: user.provincia,
        canton: user.canton,
        distrito: user.distrito,
        rol: userRole  // Devolver como 'rol' para consistencia en el frontend
      }
    });

  } catch (error) {
    console.error("❌ Error en login:", error);
    return res.status(500).json({ error: "Error interno del servidor", details: error.message });
  }
}