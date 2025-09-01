import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  // Configurar CORS headers
  const allowedOrigin = 'https://admin-panel-three-lilac.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      // Obtener todos los productos que tienen URLs de example.com
      const { data: products, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .like('image_url', '%example.com%');

      if (fetchError) {
        return res.status(400).json({ error: fetchError.message });
      }

      console.log(`Found ${products.length} products with example.com images`);

      // Mapeo de productos a URLs de imágenes reales
      const imageMapping = {
        'aceite-sintetico': 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?q=80&w=500&auto=format',
        'bateria': 'https://images.unsplash.com/photo-1609220136736-443140cffec6?q=80&w=500&auto=format',
        'pastillas-freno': 'https://images.unsplash.com/photo-1492171983775-a51717616c0d?q=80&w=500&auto=format',
        'amortiguadores': 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?q=80&w=500&auto=format',
        'filtro-aceite': 'https://images.unsplash.com/photo-1486496572940-2bb2341fdbdf?q=80&w=500&auto=format'
      };

      const updates = [];

      for (const product of products) {
        let newImageUrl = null;
        
        // Buscar qué tipo de imagen es basándose en la URL
        for (const [key, url] of Object.entries(imageMapping)) {
          if (product.image_url && product.image_url.includes(key)) {
            newImageUrl = url;
            break;
          }
        }

        // Si no encontramos una imagen específica, usar una imagen genérica de auto
        if (!newImageUrl) {
          newImageUrl = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=500&auto=format';
        }

        // Actualizar el producto
        const { data: updatedProduct, error: updateError } = await supabase
          .from('products')
          .update({ 
            image_url: newImageUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id)
          .select();

        if (updateError) {
          console.error(`Error updating product ${product.id}:`, updateError);
        } else {
          updates.push({
            id: product.id,
            name: product.name,
            old_url: product.image_url,
            new_url: newImageUrl
          });
          console.log(`Updated product ${product.name} with new image URL`);
        }
      }

      return res.status(200).json({
        message: `Successfully updated ${updates.length} products`,
        updates: updates
      });

    } catch (error) {
      console.error('Error updating product images:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
