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

  if (req.method === 'POST') {
    try {
      console.log('POST request body:', req.body);
      
      const {
        name,
        description,
        price,
        stock,
        category_id,
        image_url,
        image_path
      } = req.body;

      // Verificamos si hay campos obligatorios vacíos
      if (!name || price === undefined || price === null) {
        console.log('Campos faltantes:', { name: !!name, price: price !== undefined });
        return res.status(400).json({
          error: "Campos obligatorios faltantes",
          missing: {
            name: !name,
            price: price === undefined || price === null
          },
          received: { name, price, description, stock, category_id }
        });
      }

      const productData = {
        name,
        description: description || '',
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        category_id: category_id || null,
        image_url: image_url || null,
        image_path: image_path || null
      };

      console.log('Insertando producto:', productData);

      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select();

      if (error) {
        console.error('Error de Supabase:', error);
        return res.status(400).json({ error: error.message, details: error });
      }
      
      console.log('Producto creado exitosamente:', data[0]);
      return res.status(201).json(data[0]);
    } catch (err) {
      console.error('Error general en POST:', err);
      return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
    }
  }

  if (req.method === 'GET') {
    const { category_id } = req.query;
    let query = supabase
      .from('products')
      .select('*, categories(name)');
      
    if (category_id) {
      query = query.eq('category_id', category_id);
    }
    
    const { data, error } = await query.order('name');
      
    if (error) return res.status(400).json({ error: error.message });
    
    // Formatear los datos para que incluyan category_name
    const formattedData = data.map(product => ({
      ...product,
      category_name: product.categories ? product.categories.name : null
    }));
    
    return res.status(200).json(formattedData);
  }

  if (req.method === 'PUT') {
    // Obtener ID de query parameter o de la URL
    const id = req.query.id || req.url?.split('/').pop();
    
    console.log('PUT request - ID from query:', req.query.id);
    console.log('PUT request - ID from URL:', req.url?.split('/').pop());
    console.log('PUT request - Final ID:', id);
    
    if (!id) {
      return res.status(400).json({ error: 'ID de producto no proporcionado' });
    }
    
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

    const { data, error } = await supabase
      .from('products')
      .update({
        name,
        description: description || '',
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        category_id,
        image_url: image_url || null,
        image_path: image_path || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) return res.status(400).json({ error: error.message });
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    return res.status(200).json(data[0]);
  }

  if (req.method === 'DELETE') {
    try {
      // Obtener el ID desde el query string (?id=...) o desde el cuerpo de la petición
      const id = req.query.id || req.body.id;
      console.log('DELETE request - ID:', id);
      console.log('Query params:', req.query);
      console.log('Request body:', req.body);
      
      if (!id) {
        return res.status(400).json({ error: 'ID de producto no proporcionado' });
      }
      
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
      
      // Eliminar el producto directamente (sin manejo de imágenes de storage por ahora)
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
