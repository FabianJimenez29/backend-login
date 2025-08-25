import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase - necesita usar una clave de servicio para esta operación
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bazixgggnwpswkxwaete.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJheml4Z2dnbndwc3dreHdhZXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NjEzODEsImV4cCI6MjA3MTUzNzM4MX0.VwA5elZYp_YreG7oo68eaf83UaNhtwQMTugAd8D9cTo';

// Crear cliente de Supabase con opciones seguras
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

  // Este endpoint intentará configurar automáticamente el bucket y las políticas
  
  try {
    // 1. Comprobar si estamos usando una clave de servicio
    const isServiceKey = SUPABASE_KEY.includes('service_role');
    
    if (!isServiceKey) {
      return res.status(403).json({
        success: false,
        error: 'Se requiere una clave de servicio',
        message: 'Para configurar automáticamente el bucket y las políticas, debe usar una clave de servicio (service_role)',
        howToGet: 'Ve a tu dashboard de Supabase -> Configuración del proyecto -> API -> service_role key'
      });
    }
    
    // 2. Verificar si ya existe el bucket 'promociones'
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      return res.status(500).json({
        success: false,
        error: 'Error al listar buckets',
        details: bucketsError.message
      });
    }
    
    const bucketExists = buckets.some(b => b.name === 'promociones');
    let createdBucket = false;
    
    // 3. Crear el bucket si no existe
    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket('promociones', {
        public: true // Intentar hacerlo público directamente
      });
      
      if (createError) {
        return res.status(500).json({
          success: false,
          error: 'Error al crear el bucket',
          details: createError.message
        });
      }
      
      createdBucket = true;
    }
    
    // 4. Configurar las políticas de acceso (esto solo funcionará con una clave de servicio)
    // Nota: Esta es una representación simplificada, ya que la configuración de políticas
    // por API no está directamente disponible en el SDK de cliente de Supabase
    
    // 5. Intentar subir un archivo de prueba para verificar permisos
    const testContent = 'Esta es una prueba de acceso al bucket.';
    const testBlob = new Blob([testContent], { type: 'text/plain' });
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('promociones')
      .upload('test-permissions.txt', testBlob, {
        cacheControl: '3600',
        upsert: true
      });
      
    if (uploadError) {
      return res.status(500).json({
        success: false,
        error: 'Error al subir archivo de prueba',
        details: uploadError.message,
        recommendation: 'Es necesario configurar las políticas manualmente en el dashboard de Supabase'
      });
    }
    
    // 6. Obtener la URL pública del archivo de prueba
    const { data: urlData } = supabase
      .storage
      .from('promociones')
      .getPublicUrl('test-permissions.txt');
      
    const publicUrl = urlData.publicUrl;
    
    // 7. Devolver resultado exitoso con instrucciones
    return res.status(200).json({
      success: true,
      bucketStatus: bucketExists ? 'El bucket ya existía' : 'El bucket se ha creado exitosamente',
      testFile: {
        name: 'test-permissions.txt',
        url: publicUrl,
        uploaded: uploadData ? true : false
      },
      nextSteps: [
        "Ahora puedes subir imágenes al bucket 'promociones' usando el dashboard de Supabase",
        "Las imágenes deben tener extensiones: .jpg, .jpeg, .png, .gif o .webp",
        "Una vez subidas, estarán disponibles a través del endpoint /api/promotions-direct"
      ],
      manualSetupLink: "https://app.supabase.com/project/_/storage/buckets",
      note: "Si aún tienes problemas para acceder a las imágenes, es posible que necesites configurar las políticas manualmente en el dashboard de Supabase"
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
