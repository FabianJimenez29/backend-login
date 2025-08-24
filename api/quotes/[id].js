import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, PUT, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Extraer el ID de la URL de la solicitud (req.query para API Routes de Next.js/Vercel)
  let id;
  if (req.query && req.query.id) {
    id = req.query.id;
  } else if (req.params && req.params.id) {
    // Para otros frameworks que usan req.params
    id = req.params.id;
  } else {
    // Extraer manualmente de la URL si es necesario
    const urlParts = req.url.split('/');
    id = urlParts[urlParts.length - 1];
  }
  
  console.log('ID obtenido de la solicitud:', id, 'URL:', req.url);

  if (!id) {
    return res.status(400).json({ error: 'Se requiere el ID de la cita' });
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Cita no encontrada' });

      // Formatear los datos para compatibilidad con el frontend
      const formattedData = {
        ...data,
        clientName: data.client_name,
        clientEmail: data.client_email,
        clientPhone: data.client_phone,
        clientProvincia: data.client_provincia,
        clientCanton: data.client_canton,
        clientDistrito: data.client_distrito
      };

      return res.status(200).json({ quote: formattedData });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      console.log('PATCH request recibido para id:', id);
      console.log('Body:', req.body);
      
      const { status, tecnico, observaciones, checklist_data } = req.body;
      
      const updateData = {};
      if (status) updateData.status = status;
      if (tecnico) updateData.tecnico = tecnico;
      if (observaciones) updateData.observaciones = observaciones;
      if (checklist_data) updateData.checklist_data = checklist_data;
      
      console.log('Datos a actualizar:', updateData);
      
      const { data, error } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error en Supabase:', error);
        throw error;
      }
      
      console.log('Actualización exitosa:', data);
      return res.status(200).json({ quote: data[0] });
    } catch (error) {
      console.error('Error en PATCH:', error.message);
      return res.status(400).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
