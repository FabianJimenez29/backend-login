import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  // Configurar CORS headers específicamente para este endpoint
  const allowedOrigin = 'https://admin-panel-three-lilac.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'DELETE') {
    // Obtener el ID desde el query string o desde el body
    const id = req.query.id || req.body.id;
    console.log('DELETE request - ID:', id);
    
    if (!id) {
      return res.status(400).json({ error: 'ID de producto no proporcionado' });
    }
    
    try {
      // Primero obtenemos el producto para devolverlo en la respuesta
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error('Error al obtener producto:', fetchError);
        return res.status(400).json({ error: fetchError.message });
      }
      
      if (!product) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      
      // Si el producto tiene una imagen en Supabase Storage, eliminarla
      if (product.image_path) {
        try {
          const { error: storageError } = await supabase
            .storage
            .from('images')
            .remove([product.image_path]);
            
          if (storageError) {
            console.error('Error al eliminar imagen de Storage:', storageError);
            // No bloqueamos el proceso si falla la eliminación de la imagen
          }
        } catch (err) {
          console.error('Error al eliminar imagen:', err);
        }
      }
      
      // Luego eliminamos el producto
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (deleteError) {
        console.error('Error al eliminar producto:', deleteError);
        return res.status(400).json({ error: deleteError.message });
      }
      
      return res.status(200).json({ 
        message: 'Producto eliminado correctamente',
        product 
      });
    } catch (error) {
      console.error('Error general al eliminar producto:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
