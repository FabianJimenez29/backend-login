import express from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const router = express.Router();

// Configurar Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('🔍 Environment check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseKey,
  nodeEnv: process.env.NODE_ENV
});

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase configuration missing:', {
    SUPABASE_URL: supabaseUrl ? 'present' : 'missing',
    SUPABASE_KEY: supabaseKey ? 'present' : 'missing'
  });
}

let supabase;
try {
  supabase = createClient(supabaseUrl || '', supabaseKey || '');
  console.log('✅ Supabase client created');
} catch (error) {
  console.error('❌ Error creating Supabase client:', error);
}

// Configurar multer para manejar archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB límite
  },
  fileFilter: (req, file, cb) => {
    // Verificar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes.'), false);
    }
  }
});

// Endpoint para subir imagen
router.post('/', upload.single('image'), async (req, res) => {
  // Configurar CORS headers
  const origin = req.headers.origin;
  if (origin === 'https://admin-panel-three-lilac.vercel.app' || origin === 'http://localhost:3000') {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  try {
    console.log('📁 Recibiendo solicitud de subida de imagen...');
    
    if (!supabase) {
      return res.status(500).json({
        success: false,
        message: 'Servicio de almacenamiento no disponible'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ningún archivo'
      });
    }

    const file = req.file;
    console.log('📄 Archivo recibido:', {
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    // Generar nombre único para el archivo
    const fileExtension = path.extname(file.originalname);
    const fileName = `products/${uuidv4()}${fileExtension}`;

    console.log('🔄 Subiendo a Supabase Storage...');
    
    // Subir archivo a Supabase Storage
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      console.error('❌ Error al subir a Supabase:', error);
      return res.status(500).json({
        success: false,
        message: `Error al subir imagen: ${error.message}`
      });
    }

    console.log('✅ Archivo subido exitosamente:', data);

    // Obtener URL pública
    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;

    console.log('🔗 URL pública generada:', publicUrl);

    res.json({
      success: true,
      message: 'Imagen subida exitosamente',
      url: publicUrl,
      path: fileName
    });

  } catch (error) {
    console.error('💥 Error en upload-image:', error);
    res.status(500).json({
      success: false,
      message: `Error interno del servidor: ${error.message}`
    });
  }
});

// Endpoint para eliminar imagen
router.delete('/', async (req, res) => {
  // Configurar CORS headers
  const origin = req.headers.origin;
  if (origin === 'https://admin-panel-three-lilac.vercel.app' || origin === 'http://localhost:3000') {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  try {
    const { imagePath } = req.body;
    
    console.log('🗑️ Eliminando imagen:', imagePath);
    
    if (!supabase) {
      return res.status(500).json({
        success: false,
        message: 'Servicio de almacenamiento no disponible'
      });
    }
    
    if (!imagePath) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó la ruta de la imagen'
      });
    }

    // Eliminar archivo de Supabase Storage
    const { error } = await supabase.storage
      .from('product-images')
      .remove([imagePath]);

    if (error) {
      console.error('❌ Error al eliminar de Supabase:', error);
      return res.status(500).json({
        success: false,
        message: `Error al eliminar imagen: ${error.message}`
      });
    }

    console.log('✅ Imagen eliminada exitosamente');

    res.json({
      success: true,
      message: 'Imagen eliminada exitosamente'
    });

  } catch (error) {
    console.error('💥 Error al eliminar imagen:', error);
    res.status(500).json({
      success: false,
      message: `Error interno del servidor: ${error.message}`
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Upload image service is running',
    hasSupabase: !!supabase,
    timestamp: new Date().toISOString()
  });
});

// Manejar OPTIONS requests (preflight)
router.options('/', (req, res) => {
  const origin = req.headers.origin;
  if (origin === 'https://admin-panel-three-lilac.vercel.app' || origin === 'http://localhost:3000') {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

export default router;