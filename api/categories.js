import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  // Configurar CORS headers específicamente para este endpoint
  const allowedOrigin = 'https://admin-panel-three-lilac.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { id } = req.query;
    
    try {
      if (id) {
        // Obtener una categoría específica
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) return res.status(400).json({ error: error.message });
        if (!data) return res.status(404).json({ error: 'Categoría no encontrada' });
        
        return res.status(200).json(data);
      } else {
        // Obtener todas las categorías
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name', { ascending: true });
        
        if (error) return res.status(400).json({ error: error.message });
        
        return res.status(200).json(data);
      }
    } catch (error) {
      console.error('Error al obtener categorías:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  if (req.method === 'POST') {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'El nombre de la categoría es requerido' });
    }
    
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name, description: description || '' }])
        .select();
      
      if (error) return res.status(400).json({ error: error.message });
      return res.status(201).json(data[0]);
    } catch (error) {
      console.error('Error al crear categoría:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  if (req.method === 'PUT') {
    const id = req.query.id;
    const { name, description } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'ID de categoría no proporcionado' });
    }
    
    if (!name) {
      return res.status(400).json({ error: 'El nombre de la categoría es requerido' });
    }
    
    try {
      const { data, error } = await supabase
        .from('categories')
        .update({ name, description: description || '' })
        .eq('id', id)
        .select();
      
      if (error) return res.status(400).json({ error: error.message });
      if (!data || data.length === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
      
      return res.status(200).json(data[0]);
    } catch (error) {
      console.error('Error al actualizar categoría:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  if (req.method === 'DELETE') {
    const id = req.query.id;
    
    if (!id) {
      return res.status(400).json({ error: 'ID de categoría no proporcionado' });
    }
    
    try {
      // Verificar si hay productos asociados a esta categoría
      const { count, error: countError } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', id);
      
      if (countError) return res.status(400).json({ error: countError.message });
      
      if (count && count > 0) {
        return res.status(400).json({ 
          error: 'No se puede eliminar esta categoría porque tiene productos asociados',
          productCount: count
        });
      }
      
      // Primero obtenemos la categoría para devolverla en la respuesta
      const { data: category, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) return res.status(400).json({ error: fetchError.message });
      if (!category) return res.status(404).json({ error: 'Categoría no encontrada' });
      
      // Luego la eliminamos
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      
      if (deleteError) return res.status(400).json({ error: deleteError.message });
      
      return res.status(200).json({ 
        message: 'Categoría eliminada correctamente',
        category 
      });
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
