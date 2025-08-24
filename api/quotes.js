import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Eliminar citas viejas (más de 1 día)
  await supabase
    .from('quotes')
    .delete()
    .lt('date', new Date().toISOString().slice(0, 10));

  if (req.method === 'POST') {
    const { clientName, service, time, date } = req.body;
    const { data, error } = await supabase
      .from('quotes')
      .insert([{ client_name: clientName, service, time, date }])
      .select();
    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json({ quote: data[0] });
  }

  if (req.method === 'GET') {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('date', date)
      .order('time', { ascending: true });
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ quotes: data });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}