import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import adminsRouter from './api/admins.js';
import loginRouter from './api/login.js';
import registerRouter from './api/register.js';
import quotesRouter from './api/quotes.js';
import availabilityRouter from './api/availability.js';
import promotionsRouter from './api/promotions.js';
import bannerImagesRouter from './api/banner-images.js';
import productsHandler from './api/products.js';
import categoriesHandler from './api/categories.js';

// Configuración de ES Modules para __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de variables de entorno
dotenv.config();

// Inicialización de la app Express
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'https://admin-panel-tawny-seven.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para logs
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Inicialización del cliente de Supabase
export const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

// Rutas principales
app.use('/api/admins', adminsRouter);
app.use('/api/login', loginRouter);
app.use('/api/register', registerRouter);
app.use('/api/quotes', quotesRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/promotions', promotionsRouter);
app.use('/api/banner-images', bannerImagesRouter);

// Ruta de productos usando el handler de Supabase
app.use('/api/products', (req, res) => productsHandler(req, res));

// Ruta de categorías usando el handler de Supabase
app.use('/api/categories', (req, res) => categoriesHandler(req, res));

// Nota: Los endpoints de productos y categorías ahora son manejados por sus respectivos handlers usando Supabase

// Carpeta para archivos estáticos
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Ruta para el índice
app.get('/', (req, res) => {
  res.json({ 
    message: "Backend funcionando 🚀", 
    status: "OK",
    timestamp: new Date().toISOString(),
    endpoints: [
      "/api/login",
      "/api/register",
      "/api/admins",
      "/api/quotes",
      "/api/availability",
      "/api/promotions",
      "/api/banner-images",
      "/api/products",
      "/api/categories"
    ]
  });
});

// Ruta para subir imágenes de productos
app.post('/api/products/upload-image', (req, res) => {
  try {
    // En un entorno real, aquí se configuraría multer para manejar la subida de imágenes
    // Por ahora, simplemente simulamos el comportamiento
    res.json({
      url: `https://picsum.photos/id/${Math.floor(Math.random() * 1000)}/300/300`,
      message: 'Imagen subida correctamente'
    });
  } catch (error) {
    console.error('Error al subir imagen:', error);
    res.status(500).json({ error: 'Error al procesar la imagen' });
  }
});

// Manejador de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    message: 'Error interno del servidor', 
    error: process.env.NODE_ENV === 'production' ? 'Se ha producido un error' : err.message 
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
