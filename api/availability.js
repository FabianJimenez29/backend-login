import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Máximo de citas por hora
const MAX_APPOINTMENTS_PER_HOUR = 5;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const { fecha, sucursal } = req.query;

      if (!fecha) {
        return res.status(400).json({ error: 'Se requiere el parámetro fecha' });
      }

      // Consulta todas las citas para esa fecha
      const { data, error } = await supabase
        .from('quotes')
        .select('hora, sucursal')
        .eq('fecha', fecha);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      // Contamos cuántas citas hay para cada hora
      const horasConteo = {};
      
      data.forEach(cita => {
        // Si se especificó sucursal, solo contamos las de esa sucursal
        if (sucursal && cita.sucursal !== sucursal) {
          return;
        }
        
        if (!horasConteo[cita.hora]) {
          horasConteo[cita.hora] = 0;
        }
        horasConteo[cita.hora]++;
      });

      // Lista de todas las horas disponibles
      const todasLasHoras = [
        { label: "08:00 AM", value: "08:00" },
        { label: "09:00 AM", value: "09:00" },
        { label: "10:00 AM", value: "10:00" },
        { label: "11:00 AM", value: "11:00" },
        { label: "12:00 PM", value: "12:00" },
        { label: "01:00 PM", value: "13:00" },
        { label: "02:00 PM", value: "14:00" },
        { label: "03:00 PM", value: "15:00" },
        { label: "04:00 PM", value: "16:00" },
      ];

      // Filtramos las horas que ya tienen el máximo de citas
      const horasDisponibles = todasLasHoras.filter(hora => 
        !horasConteo[hora.value] || horasConteo[hora.value] < MAX_APPOINTMENTS_PER_HOUR
      );

      return res.status(200).json({ 
        horasDisponibles,
        horasOcupadas: Object.keys(horasConteo).filter(hora => 
          horasConteo[hora] >= MAX_APPOINTMENTS_PER_HOUR
        )
      });
    } catch (err) {
      return res.status(500).json({ error: 'Error del servidor', details: err.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
