import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  // Headers CORS más específicos
  const allowedOrigins = ['http://localhost:3000', 'https://admin-panel-tawny-seven.vercel.app'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Manejar preflight OPTIONS requests explícitamente
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
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
      .insert([{
        name,
        description: description || '',
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        category_id,
        image_url: image_url || null,
        image_path: image_path || null
      }])
      .select();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(data[0]);
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
    const id = req.query.id;
    
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
    // Extraer ID de la URL de varias maneras posibles
    let id = req.query.id;
    
    // Si no está en query, intentar extraerlo de la URL
    if (!id && req.url) {
      const urlParts = req.url.split('/');
      // La URL será algo como /896413ba-fe91-44e6-9a0a-24c7ac28a4a4
      const potentialId = urlParts[urlParts.length - 1];
      if (potentialId && potentialId !== 'products') {
        id = potentialId;
      }
    }
    
    console.log('DELETE request - ID extracted:', id);
    console.log('DELETE request - URL:', req.url);
    console.log('DELETE request - Query:', req.query);
    
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
      return res.status(400).json({ error: deleteError.message });
    }
    
    return res.status(200).json({ 
      message: 'Producto eliminado correctamente',
      product 
    });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
