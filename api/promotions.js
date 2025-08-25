import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

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
    // Verificar conexión con Supabase
    console.log('Conectando a Supabase URL:', process.env.SUPABASE_URL);
    
    // Listar todos los buckets para verificar que 'promociones' existe
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      console.error('Error al listar buckets:', bucketsError);
      return res.status(500).json({ 
        error: 'Error al listar buckets', 
        details: bucketsError.message,
        supabaseUrl: process.env.SUPABASE_URL 
      });
    }
    
    // Verificar si el bucket 'promociones' existe
    const bucketExists = buckets.some(bucket => bucket.name === 'promociones');
    if (!bucketExists) {
      return res.status(404).json({ 
        error: 'El bucket "promociones" no existe', 
        availableBuckets: buckets.map(b => b.name) 
      });
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
