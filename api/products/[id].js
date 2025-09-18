import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  // Configurar CORS headers específicamente para este endpoint
  const allowedOrigin = 'https://admin-panel-three-lilac.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Obtener ID de la URL
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'ID de producto no proporcionado' });
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('id', id)
        .single();
        
      if (error) return res.status(400).json({ error: error.message });
      
      if (!data) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      
      // Formatear los datos
      const formattedData = {
        ...data,
        category_name: data.categories ? data.categories.name : null
      };
      
      return res.status(200).json(formattedData);
    } catch (err) {
      console.error('Error al obtener producto:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  if (req.method === 'PUT') {
    try {
      console.log('PUT request for product ID:', id);
      console.log('PUT request body:', req.body);
      
      const {
        name,
        description,
        price,
        stock,
        category_id,
        image_url,
        image_path
      } = req.body;

      if (!name || price === undefined) {
        return res.status(400).json({
          error: "Campos obligatorios faltantes",
          missing: {
            name: !name,
            price: price === undefined
          }
        });
      }

      const updateData = {
        name,
        description: description || '',
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        category_id,
        image_url: image_url || null,
        image_path: image_path || null,
        updated_at: new Date().toISOString()
      };

      console.log('Updating product with data:', updateData);

      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        return res.status(400).json({ error: error.message });
      }
      
      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      
      console.log('Product updated successfully:', data[0]);
      return res.status(200).json(data[0]);
    } catch (err) {
      console.error('Error general en PUT:', err);
      return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      console.log('DELETE request for product ID:', id);
      
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
      
      // Eliminar el producto
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (deleteError) {
        console.error('Error al eliminar producto:', deleteError);
        return res.status(400).json({ error: deleteError.message });
      }
      
      console.log('Producto eliminado exitosamente:', product.name);
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