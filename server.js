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
  origin: function (origin, callback) {
    const allowedOrigins = ['http://localhost:3000', 'https://admin-panel-tawny-seven.vercel.app'];
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
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
// Rutas explícitas para productos
app.get('/api/products', (req, res) => productsHandler(req, res));
app.post('/api/products', (req, res) => productsHandler(req, res));
app.put('/api/products/:id', (req, res) => {
  req.query.id = req.params.id;
  productsHandler(req, res);
});
app.delete('/api/products/:id', (req, res) => {
  req.query.id = req.params.id;
  productsHandler(req, res);
});
app.options('/api/products*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Ruta de categorías usando el handler de Supabase
// Rutas explícitas para categorías
app.get('/api/categories', (req, res) => categoriesHandler(req, res));
app.post('/api/categories', (req, res) => categoriesHandler(req, res));
app.put('/api/categories/:id', (req, res) => {
  req.query.id = req.params.id;
  categoriesHandler(req, res);
});
app.delete('/api/categories/:id', (req, res) => {
  req.query.id = req.params.id;
  categoriesHandler(req, res);
});
app.options('/api/categories*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

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

// Configuración para el manejo de archivos con multer
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

// Configurar almacenamiento temporal para multer
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB límite
  fileFilter: function (req, file, cb) {
    // Validar tipos de archivos (solo imágenes)
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'));
  }
});

// Ruta para subir imágenes de productos
app.post('/api/products/upload-image', upload.single('image'), async (req, res) => {
  // Establecer los headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Para solicitudes OPTIONS, simplemente responder con OK
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha proporcionado ninguna imagen' });
    }

    console.log('Procesando imagen:', req.file.originalname);
    
    const file = req.file;
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    const filePath = `products/${fileName}`;
    
    console.log('Subiendo a Supabase bucket "images", ruta:', filePath);
    console.log('Supabase URL:', process.env.SUPABASE_URL);
    
    // Subir archivo a Supabase Storage
    const { data, error } = await supabase
      .storage
      .from('images') // Nombre del bucket en Supabase
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true // Usar upsert para sobrescribir si existe
      });
    
    if (error) {
      console.error('Error al subir a Supabase:', error);
      return res.status(500).json({ error: `Error al subir imagen a Supabase: ${error.message}` });
    }
    
    console.log('Imagen subida exitosamente, obteniendo URL pública');
    
    // Obtener URL pública del archivo subido
    const { data: publicUrlData } = supabase
      .storage
      .from('images')
      .getPublicUrl(filePath);
    
    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error('No se pudo obtener URL pública');
      return res.status(500).json({ error: 'Error al obtener URL pública de la imagen' });
    }
    
    console.log('URL pública obtenida:', publicUrlData.publicUrl);
    
    return res.status(200).json({
      url: publicUrlData.publicUrl,
      path: filePath,
      message: 'Imagen subida correctamente'
    });
  } catch (error) {
    console.error('Error al procesar la imagen:', error);
    return res.status(500).json({ error: `Error al procesar la imagen: ${error.message}` });
  }
});

// Ruta para eliminar una imagen de producto
app.delete('/api/products/delete-image', async (req, res) => {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const { path } = req.body;
    
    if (!path) {
      return res.status(400).json({ error: 'Ruta de archivo no proporcionada' });
    }
    
    console.log('Eliminando imagen:', path);
    
    // Eliminar archivo de Supabase Storage
    const { error } = await supabase
      .storage
      .from('images')
      .remove([path]);
    
    if (error) {
      console.error('Error al eliminar imagen de Supabase:', error);
      return res.status(500).json({ error: `Error al eliminar imagen: ${error.message}` });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Imagen eliminada correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar imagen:', error);
    return res.status(500).json({ error: `Error al eliminar imagen: ${error.message}` });
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
