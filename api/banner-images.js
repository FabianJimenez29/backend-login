import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Crear cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

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
    // Definimos el nombre del bucket de imágenes para banner
    const bucketName = 'banner-images';
    
    // Verificamos que el bucket exista y tenemos acceso
    const { error: checkError } = await supabase
      .storage
      .from(bucketName)
      .list('', { limit: 1 });
    
    if (checkError) {
      return res.status(200).json({
        success: false,
        error: `No se pudo acceder al bucket "${bucketName}"`,
        details: checkError.message,
        message: 'Verifica las políticas de acceso en Supabase para este bucket',
        bannerImages: [
          // Imágenes de respaldo para mantener la app funcionando
          { name: 'placeholder-banner1.jpg', url: 'https://via.placeholder.com/1200x400/007BFF/FFFFFF/?text=Banner+1' },
          { name: 'placeholder-banner2.jpg', url: 'https://via.placeholder.com/1200x400/28A745/FFFFFF/?text=Banner+2' },
          { name: 'placeholder-banner3.jpg', url: 'https://via.placeholder.com/1200x400/DC3545/FFFFFF/?text=Banner+3' }
        ]
      });
    }
    
    // Listar las imágenes del bucket
    const { data, error } = await supabase
      .storage
      .from(bucketName)
      .list('', {
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      return res.status(500).json({ 
        success: false,
        error: 'Error al obtener imágenes del banner',
        details: error.message
      });
    }

    // Filtrar solo archivos de imagen
    const imageFiles = data?.filter((file) => 
      file.name && file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    ) || [];

    // Obtener las URLs públicas de cada imagen
    const imageUrls = await Promise.all(
      imageFiles.map(async (file) => {
        const { data: publicUrl } = supabase
          .storage
          .from(bucketName) // Usamos el nombre exacto del bucket
          .getPublicUrl(file.name);

        return {
          name: file.name,
          url: publicUrl.publicUrl
        };
      })
    );

    return res.status(200).json({
      success: true,
      bannerImages: imageUrls
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
}
