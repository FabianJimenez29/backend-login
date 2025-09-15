import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

  // Obtener el ID del usuario de la URL
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'ID de usuario requerido' });
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const { nombre, email, telefono, provincia, canton, distrito } = req.body;

      // Preparar datos para actualizar
      const updateData = {};
      if (nombre) updateData.full_name = nombre;
      if (email) updateData.email = email;
      if (telefono !== undefined) updateData.phone = telefono;
      if (provincia !== undefined) updateData.provincia = provincia;
      if (canton !== undefined) updateData.canton = canton;
      if (distrito !== undefined) updateData.distrito = distrito;

      // Verificar que el usuario existe
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', id)
        .single();

      if (userError || !existingUser) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Si se cambia el email, verificar que no esté en uso
      if (email) {
        const { data: emailExists } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .neq('id', id)
          .single();

        if (emailExists) {
          return res.status(400).json({ error: 'El email ya está en uso' });
        }
      }

      // Actualizar el usuario
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error actualizando usuario:', error);
        return res.status(500).json({ error: 'Error actualizando usuario' });
      }

      // Transformar datos para la respuesta
      const updatedUser = {
        id: data.id,
        fullName: data.full_name,
        email: data.email,
        phone: data.phone || '',
        provincia: data.provincia || '',
        canton: data.canton || '',
        distrito: data.distrito || '',
      };

      return res.status(200).json({
        success: true,
        user: updatedUser,
        message: 'Usuario actualizado exitosamente'
      });

    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
