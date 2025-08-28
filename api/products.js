import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const {
      name,
      description,
      price,
      stock,
      category_id,
      image_url
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
        image_url: image_url || null
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
      image_url
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
    const id = req.query.id;
    
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
    
    // Luego lo eliminamos
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
