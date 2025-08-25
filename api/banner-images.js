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
    // Obtener la lista de imágenes del bucket "banner-images"
    const { data, error } = await supabase
      .storage
      .from('banner-images')
      .list('', {
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      console.error('Error al obtener la lista de imágenes:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Error al obtener imágenes del banner' 
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
          .from('banner-images')
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
    console.error('Error inesperado:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
}
