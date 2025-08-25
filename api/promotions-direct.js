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
    // 1. Directamente intentamos listar archivos en el bucket 'promociones' sin verificar si existe
    // o intentar crearlo, asumiendo que ya existe en Supabase
    const { data: files, error: filesError } = await supabase
      .storage
      .from('promociones')
      .list();
      
    if (filesError) {
      // Si hay un error al listar archivos, informamos claramente
      return res.status(500).json({
        success: false,
        error: 'Error al acceder al bucket promociones',
        details: filesError.message,
        suggestion: 'Verifica que el bucket existe en Supabase y que la API key tiene permisos para acceder a él',
        apiInfo: {
          url: SUPABASE_URL.substring(0, 20) + '...',
          keyType: SUPABASE_KEY.includes('service_role') ? 'service_role' : 'anon'
        }
      });
    }
    
    // 2. Si llegamos aquí, pudimos listar archivos (incluso si la lista está vacía)
    
    // Filtrar solo archivos de imagen
    const imageFiles = files?.filter(file => 
      file.name && /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)
    ) || [];
    
    // Generar URLs públicas para cada imagen
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
    
    // 3. Devolver los resultados
    return res.status(200).json({
      success: true,
      promotions: promotionImages,
      totalImages: imageFiles.length,
      message: imageFiles.length > 0 ? 
        'Imágenes promocionales cargadas exitosamente' : 
        'El bucket existe pero no contiene imágenes con extensiones válidas'
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
