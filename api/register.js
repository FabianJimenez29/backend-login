
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    console.log("📝 Intento de registro:", req.body);
    
    const { fullName, email, phone, password, provincia, canton, distrito } = req.body;

    if (!fullName || !email || !password || !phone || !provincia || !canton || !distrito) {
      return res.status(400).json({ 
        error: "Por favor completa todos los campos",
        received: Object.keys(req.body)
      });
    }

    // Verificar si el usuario ya existe
    const { data: existingUser } = await supabase
      .from("users")
      .select("email")
      .eq("email", email)
      .single();

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
        distrito
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

    res.status(201).json({ 
      message: "Usuario registrado correctamente",
      token,
      user: {
        id: data[0].id,
        fullName: data[0].full_name,
        email: data[0].email,
        phone: data[0].phone,
        provincia: data[0].provincia,
        canton: data[0].canton,
        distrito: data[0].distrito
      }
    });

  } catch (error) {
    console.error("❌ Error en registro:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}