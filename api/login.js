
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
    console.log("🔐 Intento de login:", req.body);
    
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Por favor completa todos los campos" });
    }

    // Buscar el usuario por email
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      console.log("❌ Usuario no encontrado:", email);
      return res.status(400).json({ error: "Credenciales incorrectas" });
    }

    // Comparar contraseñas
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      console.log("❌ Contraseña incorrecta para:", email);
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    // Generar JWT
    const JWT_SECRET = process.env.JWT_SECRET || "superclave123";
    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: "7d" }
    );

    console.log("✅ Login exitoso:", user.email);

    // Devolver datos del usuario (sin la contraseña)
    res.status(200).json({
      message: "Login exitoso",
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        provincia: user.provincia,
        canton: user.canton,
        distrito: user.distrito,
      },
    });

  } catch (error) {
    console.error("❌ Error en login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}