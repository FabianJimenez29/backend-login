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
      // Obtener todos los productos que tienen URLs de Unsplash
      const { data: products, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .like('image_url', '%unsplash%');

      if (fetchError) {
        return res.status(400).json({ error: fetchError.message });
      }

      console.log(`Found ${products.length} products with Unsplash images`);

      // Mapeo de productos a imágenes de Picsum (más compatibles con Next.js)
      const imageMapping = {
        'Aceite Sintético 5W-30': 'https://picsum.photos/id/1/500/500',
        'Filtro de Aceite OEM': 'https://picsum.photos/id/2/500/500', 
        'Pastillas de Freno Delanteras': 'https://picsum.photos/id/3/500/500',
        'Batería 65Ah': 'https://picsum.photos/id/4/500/500',
        'Amortiguadores KYB': 'https://picsum.photos/id/5/500/500'
      };

      const updates = [];

      for (const product of products) {
        let newImageUrl = imageMapping[product.name];
        
        // Si no encontramos una imagen específica, usar una imagen genérica numerada
        if (!newImageUrl) {
          const randomId = Math.floor(Math.random() * 100) + 10;
          newImageUrl = `https://picsum.photos/id/${randomId}/500/500`;
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
        message: `Successfully updated ${updates.length} products with Picsum images`,
        updates: updates
      });

    } catch (error) {
      console.error('Error updating product images:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
