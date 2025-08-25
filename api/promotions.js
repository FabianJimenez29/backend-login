import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase con valores explícitos para depuración
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bazixgggnwpswkxwaete.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJheml4Z2dnbndwc3dreHdhZXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NjEzODEsImV4cCI6MjA3MTUzNzM4MX0.VwA5elZYp_YreG7oo68eaf83UaNhtwQMTugAd8D9cTo';

// Imprimir valores para debug
console.log('SUPABASE_URL utilizado:', SUPABASE_URL);
console.log('SUPABASE_KEY (primeros 10 caracteres):', SUPABASE_KEY.substring(0, 10) + '...');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Solo permitir solicitudes GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Verificar que la conexión a Supabase es válida
    try {
      // Test básico de la API de Supabase - intentar obtener la hora actual
      const { data: healthCheck, error: healthError } = await supabase.rpc('hello_world', {});
      
      if (healthError) {
        console.error('Error de conexión a Supabase:', healthError);
        return res.status(500).json({
          error: 'Error de conexión a Supabase',
          details: healthError.message,
          supabaseInfo: {
            url: SUPABASE_URL,
            keyLength: SUPABASE_KEY ? SUPABASE_KEY.length : 0,
            keyStart: SUPABASE_KEY ? SUPABASE_KEY.substring(0, 10) + '...' : 'undefined'
          }
        });
      }
      
      console.log('Conexión a Supabase exitosa:', healthCheck || 'OK');
    } catch (connectionError) {
      console.error('Error al verificar conexión:', connectionError);
    }

    console.log('Intentando listar buckets en Supabase...');
    
    // Listar todos los buckets para verificar que 'promociones' existe
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      console.error('Error al listar buckets:', bucketsError);
      
      // Intentar una creación temporal del bucket para verificar permisos
      try {
        const { error: createError } = await supabase.storage.createBucket('test-permissions', { public: false });
        
        if (createError) {
          return res.status(500).json({ 
            error: 'Error al listar buckets - Problema de permisos', 
            details: bucketsError.message,
            permissionsTest: createError.message,
            supabaseInfo: {
              url: SUPABASE_URL,
              keyType: SUPABASE_KEY.includes('service_role') ? 'service_role' : 'anon'
            }
          });
        } else {
          // Eliminar el bucket de prueba
          await supabase.storage.deleteBucket('test-permissions');
          
          return res.status(500).json({ 
            error: 'Error al listar buckets pero tienes permisos de administrador', 
            details: bucketsError.message,
            suggestion: 'Verifica que el bucket "promociones" esté creado correctamente'
          });
        }
      } catch (permError) {
        return res.status(500).json({ 
          error: 'Error al verificar permisos de Supabase', 
          details: bucketsError.message,
          permissionsError: permError.message
        });
      }
    }
    
    console.log('Buckets encontrados:', buckets);
    
    // Verificar si el bucket 'promociones' existe
    const bucketExists = buckets.some(bucket => bucket.name === 'promociones');
    
    if (!bucketExists) {
      console.log('El bucket "promociones" no existe. Intentando crearlo...');
      
      try {
        // Intentar crear el bucket automáticamente
        const { data: newBucket, error: createError } = await supabase
          .storage
          .createBucket('promociones', {
            public: true // Hacer público el bucket
          });
        
        if (createError) {
          console.error('Error al crear el bucket:', createError);
          return res.status(500).json({
            error: 'No se pudo crear el bucket "promociones"',
            details: createError.message,
            availableBuckets: buckets.map(b => b.name) || [],
            supabaseStatus: 'Conectado pero sin permisos suficientes'
          });
        }
        
        console.log('Bucket "promociones" creado exitosamente');
        
        // Establecer políticas públicas para el bucket
        const { error: policyError } = await supabase
          .storage
          .from('promociones')
          .createSignedUrl('dummy.txt', 60);
          
        if (policyError && !policyError.message.includes('not found')) {
          console.warn('Advertencia al configurar políticas:', policyError);
        }
      } catch (bucketError) {
        console.error('Error al intentar crear el bucket:', bucketError);
        return res.status(500).json({
          error: 'Error al intentar crear el bucket "promociones"',
          details: bucketError.message,
          supabaseStatus: 'Conexión establecida pero falló la creación del bucket',
          availableBuckets: buckets.map(b => b.name) || []
        });
      }
    } else {
      console.log('Bucket "promociones" encontrado correctamente');
    }
    
    // Obtener la lista de imágenes del bucket "promociones"
    // Intentamos listar en la raíz del bucket
    const { data, error } = await supabase
      .storage
      .from('promociones')
      .list('', {
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      console.error('Error al obtener la lista de imágenes:', error);
      return res.status(500).json({ error: 'Error al obtener imágenes de promociones', details: error.message });
    }

    // Datos de diagnóstico
    console.log('Archivos encontrados en el bucket:', data);
    
    // Si no hay datos, intentar buscar en carpetas (un nivel de profundidad)
    if (!data || data.length === 0) {
      console.log('No se encontraron archivos en la raíz, buscando en carpetas...');
      
      // Obtener lista de carpetas
      const { data: folders } = await supabase
        .storage
        .from('promociones')
        .list('', { sortBy: { column: 'name', order: 'asc' } });
      
      const subfolders = folders?.filter(item => item.id && !item.name.includes('.')) || [];
      
      // Si hay carpetas, buscar en cada una
      if (subfolders.length > 0) {
        let allImages = [];
        
        for (const folder of subfolders) {
          const { data: folderFiles } = await supabase
            .storage
            .from('promociones')
            .list(folder.name, { sortBy: { column: 'name', order: 'asc' } });
            
          if (folderFiles && folderFiles.length > 0) {
            // Añadir la ruta de la carpeta al nombre del archivo
            const folderImages = folderFiles.map(file => ({
              ...file,
              fullPath: `${folder.name}/${file.name}`
            }));
            allImages = [...allImages, ...folderImages];
          }
        }
        
        if (allImages.length > 0) {
          data = allImages;
        }
      }
    }
    
    // Filtrar solo archivos de imagen
    const imageFiles = data?.filter((file) => 
      file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    ) || [];
    
    console.log('Imágenes filtradas:', imageFiles);
    
    if (imageFiles.length === 0) {
      // Si no hay archivos de imagen después de filtrar, devolver más información
      return res.status(200).json({
        success: true,
        promotions: [],
        debug: {
          message: 'No se encontraron imágenes con extensiones válidas',
          filesEncontrados: data?.length || 0,
          archivosDisponibles: data?.map(f => f.name) || []
        }
      });
    }

    // Obtener las URLs públicas de cada imagen
    const imageUrls = await Promise.all(
      imageFiles.map(async (file) => {
        // Usar la ruta completa si está disponible
        const filePath = file.fullPath || file.name;
        const { data: publicUrl } = supabase
          .storage
          .from('promociones')
          .getPublicUrl(filePath);

        return {
          name: file.name,
          url: publicUrl.publicUrl,
          path: filePath
        };
      })
    );

    return res.status(200).json({
      success: true,
      promotions: imageUrls,
      debug: {
        totalFilesEnBucket: data?.length || 0,
        imagenesEncontradas: imageFiles.length
      }
    });
  } catch (error) {
    console.error('Error inesperado:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
}
