import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bazixgggnwpswkxwaete.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJheml4Z2dnbndwc3dreHdhZXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NjEzODEsImV4cCI6MjA3MTUzNzM4MX0.VwA5elZYp_YreG7oo68eaf83UaNhtwQMTugAd8D9cTo';

// Crear cliente de Supabase de manera segura
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. Verificar que existe el bucket 'promociones'
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      return res.status(500).json({
        success: false,
        error: 'Error al listar buckets',
        details: bucketsError.message
      });
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === 'promociones');
    
    if (!bucketExists) {
      try {
        // Intentar crear el bucket
        const { error: createError } = await supabase.storage.createBucket('promociones', { public: true });
        
        if (createError) {
          return res.status(500).json({
            success: false,
            error: 'No se pudo encontrar ni crear el bucket "promociones"',
            details: createError.message
          });
        }
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: 'Error al crear el bucket',
          details: error.message
        });
      }
    }
    
    // 2. Listar archivos en el bucket
    const { data: files, error: filesError } = await supabase
      .storage
      .from('promociones')
      .list('');
      
    if (filesError) {
      return res.status(500).json({
        success: false,
        error: 'Error al listar archivos',
        details: filesError.message
      });
    }
    
    // 3. Filtrar solo archivos de imagen
    const imageFiles = files?.filter(file => 
      file.name && /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)
    ) || [];
    
    // 4. Generar URLs públicas
    const promotionImages = imageFiles.map(file => {
      const { data } = supabase
        .storage
        .from('promociones')
        .getPublicUrl(file.name);
        
      return {
        name: file.name,
        url: data.publicUrl
      };
    });
    
    // 5. Devolver los resultados
    return res.status(200).json({
      success: true,
      promotions: promotionImages
    });
    
  } catch (error) {
    console.error('Error inesperado:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
}
