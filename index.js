import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import supabase from "./supabaseClient.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Clave secreta para JWT
const JWT_SECRET = process.env.JWT_SECRET || "superclave123";

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("Backend con Supabase funcionando 🚀");
});

// Registro de usuario
app.post("/register", async (req, res) => {
  const { fullName, email, phone, password, provincia, canton, distrito } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: "Por favor completa todos los campos" });
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
    }]);

  if (error) return res.status(400).json({ message: error.message });

  res.status(201).json({ message: "Usuario registrado correctamente" });
});

// Login de usuario
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Por favor completa todos los campos" });
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !user) return res.status(400).json({ message: "Usuario no encontrado" });

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) return res.status(400).json({ message: "Contraseña incorrecta" });

  // Generar JWT
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

  res.json({ 
    message: "Login exitoso", 
    token, 
    user: { id: user.id, fullName: user.full_name, email: user.email } 
  });
});

// Obtener todos los usuarios (opcional)
app.get("/users", async (req, res) => {
  const { data, error } = await supabase.from("users").select("*");
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});