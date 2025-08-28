import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Eliminar citas viejas (más de 1 día)
  await supabase
    .from('quotes')
    .delete()
    .lt('fecha', new Date().toISOString().slice(0, 10));

  if (req.method === 'POST') {
    const {
      clientName,
      clientEmail,
      clientPhone,
      clientProvincia,
      clientCanton,
      clientDistrito,
      sucursal,
      servicio,
      fecha,
      hora,
      tipo_placa,
      numero_placa,
      marca,
      modelo,
      problema
    } = req.body;

    // Verificamos si hay campos obligatorios vacíos
    if (!clientName || !clientEmail || !clientPhone || !sucursal) {
      return res.status(400).json({
        error: "Campos obligatorios faltantes",
        missing: {
          clientName: !clientName,
          clientEmail: !clientEmail,
          clientPhone: !clientPhone,
          sucursal: !sucursal
        }
      });
    }

    const { data, error } = await supabase
      .from('quotes')
      .insert([{
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        client_provincia: clientProvincia,
        client_canton: clientCanton,
        client_distrito: clientDistrito,
        sucursal,
        servicio,
        fecha,
        hora,
        tipo_placa,
        numero_placa,
        marca,
        modelo,
        problema
      }])
      .select();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json({ quote: data[0] });
  }

  if (req.method === 'GET') {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('fecha', date)
      .order('hora', { ascending: true });
      
    if (error) return res.status(400).json({ error: error.message });
    
    // Formatear los datos para que coincidan con la estructura esperada por el frontend
    const formattedData = data.map(quote => ({
      ...quote,
      // Añadir propiedades en camelCase para compatibilidad con el frontend
      clientName: quote.client_name,
      clientEmail: quote.client_email,
      clientPhone: quote.client_phone,
      clientProvincia: quote.client_provincia,
      clientCanton: quote.client_canton,
      clientDistrito: quote.client_distrito
    }));
    
    return res.status(200).json({ quotes: formattedData });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}