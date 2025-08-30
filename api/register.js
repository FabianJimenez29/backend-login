import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://admin-panel-three-lilac.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    console.log("📝 Intento de registro");
    console.log("Raw body:", req.body);
    
    // Verificar variables de entorno
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      console.error("❌ Faltan variables de entorno de Supabase");
      return res.status(500).json({ error: "Error de configuración del servidor" });
    }

    // Parsear el body si es necesario
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ error: "JSON inválido" });
      }
    }

    if (!body) {
      return res.status(400).json({ error: "Body requerido" });
    }

    const { fullName, email, phone, password, provincia, canton, distrito, role } = body;
    console.log("📧 Registrando:", email);
    console.log("Datos recibidos:", { fullName, email, phone, provincia, canton, distrito, role });

    if (!fullName || !email || !password || !phone || !provincia || !canton || !distrito) {
      return res.status(400).json({ 
        error: "Por favor completa todos los campos",
        received: Object.keys(body),
        missing: {
          fullName: !fullName,
          email: !email,
          password: !password,
          phone: !phone,
          provincia: !provincia,
          canton: !canton,
          distrito: !distrito
        }
      });
    }

    // Importar Supabase dinámicamente
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

    // Verificar si el usuario ya existe
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("email")
      .eq("email", email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (usuario no existe, que es lo que queremos)
      console.error("❌ Error verificando usuario existente:", checkError);
      return res.status(500).json({ error: "Error verificando usuario" });
    }

    if (existingUser) {
      return res.status(400).json({ error: "El email ya está registrado" });
    }

    // Hashear contraseña
    const password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("users")
      .insert([{
        full_name: fullName,
        email,
        phone,
        password_hash,
        provincia,
        canton,
        distrito,
        role: role || 'user' // Usar el rol proporcionado o 'user' por defecto
      }])
      .select();

    if (error) {
      console.error("❌ Error de Supabase:", error);
      return res.status(400).json({ error: error.message });
    }

    // Generar token para login automático
    const JWT_SECRET = process.env.JWT_SECRET || "superclave123";
    const token = jwt.sign(
      { id: data[0].id, email: data[0].email }, 
      JWT_SECRET, 
      { expiresIn: "7d" }
    );

    console.log("✅ Usuario registrado:", data[0].email);

    return res.status(201).json({ 
      message: "Usuario registrado correctamente",
      token,
      user: {
        id: data[0].id,
        fullName: data[0].full_name,
        email: data[0].email,
        phone: data[0].phone,
        provincia: data[0].provincia,
        canton: data[0].canton,
        distrito: data[0].distrito,
        role: data[0].role || 'user'
      }
    });

  } catch (error) {
    console.error("❌ Error en registro:", error);
    return res.status(500).json({ 
      error: "Error interno del servidor",
      details: error.message,
      stack: error.stack
    });
  }
}