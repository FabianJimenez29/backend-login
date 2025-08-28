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
  process.env.SUPABASE_ANON_KEY || ''
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

// Datos de muestra para productos y categorías
// Implementación básica para demo
app.get('/api/products', (req, res) => {
  const products = [
    {
      id: '1',
      name: 'Smartphone XYZ',
      description: 'Último modelo con cámara avanzada',
      price: 599.99,
      stock: 50,
      category_id: '1',
      image_url: 'https://picsum.photos/id/10/300/300',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Laptop Profesional',
      description: 'Potente laptop para trabajo y gaming',
      price: 1299.99,
      stock: 25,
      category_id: '1',
      image_url: 'https://picsum.photos/id/20/300/300',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '3',
      name: 'Sofa Moderno',
      description: 'Sofá de 3 plazas en color gris',
      price: 799.50,
      stock: 10,
      category_id: '2',
      image_url: 'https://picsum.photos/id/30/300/300',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '4',
      name: 'Camiseta Deportiva',
      description: 'Material transpirable para mayor comodidad',
      price: 29.99,
      stock: 100,
      category_id: '3',
      image_url: 'https://picsum.photos/id/40/300/300',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '5',
      name: 'Balón de Fútbol',
      description: 'Balón de competición profesional',
      price: 49.95,
      stock: 75,
      category_id: '4',
      image_url: 'https://picsum.photos/id/50/300/300',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
  
  const { category_id } = req.query;
  
  // Filtrar por categoría si es necesario
  if (category_id) {
    const filteredProducts = products.filter(p => p.category_id === category_id);
    return res.json(filteredProducts);
  }
  
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const products = [
    {
      id: '1',
      name: 'Smartphone XYZ',
      description: 'Último modelo con cámara avanzada',
      price: 599.99,
      stock: 50,
      category_id: '1',
      image_url: 'https://picsum.photos/id/10/300/300',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    // ... otros productos
  ];
  
  const product = products.find(p => p.id === id);
  
  if (!product) {
    return res.status(404).json({ message: 'Producto no encontrado' });
  }
  
  res.json(product);
});

app.post('/api/products', (req, res) => {
  const { name, description, price, stock, category_id, image_url } = req.body;
  
  if (!name || !price) {
    return res.status(400).json({ message: 'Nombre y precio son requeridos' });
  }
  
  const newProduct = {
    id: Date.now().toString(),
    name,
    description: description || '',
    price: parseFloat(price),
    stock: parseInt(stock) || 0,
    category_id,
    image_url: image_url || 'https://picsum.photos/id/99/300/300',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  res.status(201).json(newProduct);
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, price, stock, category_id, image_url } = req.body;
  
  if (!name || !price) {
    return res.status(400).json({ message: 'Nombre y precio son requeridos' });
  }
  
  const updatedProduct = {
    id,
    name,
    description: description || '',
    price: parseFloat(price),
    stock: parseInt(stock) || 0,
    category_id,
    image_url: image_url || 'https://picsum.photos/id/99/300/300',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  res.json(updatedProduct);
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  res.json({ 
    message: 'Producto eliminado correctamente',
    product: {
      id,
      name: 'Producto eliminado'
    }
  });
});

// Rutas para categorías
app.get('/api/categories', (req, res) => {
  const categories = [
    {
      id: '1',
      name: 'Electrónica',
      description: 'Productos electrónicos como smartphones, tablets y laptops',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      product_count: 2
    },
    {
      id: '2',
      name: 'Hogar',
      description: 'Artículos para el hogar y decoración',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      product_count: 1
    },
    {
      id: '3',
      name: 'Moda',
      description: 'Ropa y accesorios de moda',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      product_count: 1
    },
    {
      id: '4',
      name: 'Deportes',
      description: 'Artículos deportivos y fitness',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      product_count: 1
    }
  ];
  
  res.json(categories);
});

app.get('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  const categories = [
    {
      id: '1',
      name: 'Electrónica',
      description: 'Productos electrónicos como smartphones, tablets y laptops',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      product_count: 2
    },
    // ... otras categorías
  ];
  
  const category = categories.find(c => c.id === id);
  
  if (!category) {
    return res.status(404).json({ message: 'Categoría no encontrada' });
  }
  
  res.json(category);
});

app.post('/api/categories', (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'El nombre es requerido' });
  }
  
  const newCategory = {
    id: Date.now().toString(),
    name,
    description: description || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    product_count: 0
  };
  
  res.status(201).json(newCategory);
});

app.put('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'El nombre es requerido' });
  }
  
  const updatedCategory = {
    id,
    name,
    description: description || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    product_count: 2
  };
  
  res.json(updatedCategory);
});

app.delete('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  res.json({ 
    message: 'Categoría eliminada correctamente',
    category: {
      id,
      name: 'Categoría eliminada',
      description: ''
    }
  });
});

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
app.post('/api/products/upload', (req, res) => {
  // Esta es una versión simulada ya que no tenemos multer configurado en este script
  res.json({
    message: 'Imagen subida correctamente',
    url: 'https://picsum.photos/id/100/300/300',
    filename: `upload-${Date.now()}.jpg`
  });
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
