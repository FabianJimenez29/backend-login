import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://admin-panel-three-lilac.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Importar Supabase dinámicamente
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

  // GET - Obtener administradores
  if (req.method === "GET") {
    try {
      // Verificar autenticación - Solo verificamos si hay token, pero no lo requerimos
      const authHeader = req.headers.authorization;
      let userId = null;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        if (token) {
          // Verificar token
          const JWT_SECRET = process.env.JWT_SECRET || "superclave123";
          try {
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.id;
            console.log("Usuario autenticado:", decoded);
          } catch (e) {
            console.log("Token inválido, continuando como acceso público");
          }
        }
      }

      // Obtener usuarios con rol admin
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, phone, provincia, canton, distrito, created_at, role")
        .eq("role", "admin");

      if (error) {
        console.error("❌ Error obteniendo administradores:", error);
        return res.status(500).json({ error: "Error obteniendo administradores" });
      }

      // Transformar datos para que coincidan con el formato esperado en el frontend
      const admins = data.map(user => ({
        id: user.id,
        nombre: user.full_name,
        email: user.email,
        telefono: user.phone || '',
        rol: user.role || 'admin',
        provincia: user.provincia || '',
        canton: user.canton || '',
        distrito: user.distrito || '',
        fechaCreacion: user.created_at,
        activo: true // Por defecto todos están activos
      }));

      return res.status(200).json({ 
        success: true,
        data: admins
      });

    } catch (error) {
      console.error("❌ Error en API de administradores:", error);
      return res.status(500).json({ 
        error: "Error interno del servidor",
        details: error.message
      });
    }
  }

  // POST - Crear administrador
  if (req.method === "POST") {
    try {
      const { nombre, email, password, telefono, provincia, canton, distrito } = req.body;

      if (!nombre || !email || !password) {
        return res.status(400).json({ error: "Nombre, email y contraseña son requeridos" });
      }

      // Verificar si el email ya existe
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (existingUser) {
        return res.status(400).json({ error: "El email ya está en uso" });
      }

      // Hashear la contraseña
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

      // Crear el administrador
      const { data, error } = await supabase
        .from("users")
        .insert({
          full_name: nombre,
          email: email,
          password_hash: password_hash,
          phone: telefono || null,
          provincia: provincia || null,
          canton: canton || null,
          distrito: distrito || null,
          role: "admin"
        })
        .select()
        .single();

      if (error) {
        console.error("❌ Error creando administrador:", error);
        return res.status(500).json({ error: "Error creando administrador" });
      }

      // Transformar datos para la respuesta
      const admin = {
        id: data.id,
        nombre: data.full_name,
        email: data.email,
        telefono: data.phone || '',
        rol: data.role,
        provincia: data.provincia || '',
        canton: data.canton || '',
        distrito: data.distrito || '',
        fechaCreacion: data.created_at,
        activo: true
      };

      return res.status(201).json({
        success: true,
        data: admin,
        message: "Administrador creado exitosamente"
      });

    } catch (error) {
      console.error("❌ Error creando administrador:", error);
      return res.status(500).json({ 
        error: "Error interno del servidor",
        details: error.message
      });
    }
  }

  // PUT - Actualizar administrador
  if (req.method === "PUT") {
    try {
      const { id } = req.query;
      const { nombre, email, password, telefono, provincia, canton, distrito } = req.body;

      if (!id) {
        return res.status(400).json({ error: "ID es requerido" });
      }

      // Preparar datos para actualizar
      const updateData = {};
      if (nombre) updateData.full_name = nombre;
      if (email) updateData.email = email;
      if (telefono !== undefined) updateData.phone = telefono || null;
      if (provincia !== undefined) updateData.provincia = provincia || null;
      if (canton !== undefined) updateData.canton = canton || null;
      if (distrito !== undefined) updateData.distrito = distrito || null;

      // Si se proporciona nueva contraseña, hashearla
      if (password) {
        const saltRounds = 10;
        updateData.password_hash = await bcrypt.hash(password, saltRounds);
      }

      // Verificar que el administrador existe
      const { data: existingAdmin } = await supabase
        .from("users")
        .select("id")
        .eq("id", id)
        .eq("role", "admin")
        .single();

      if (!existingAdmin) {
        return res.status(404).json({ error: "Administrador no encontrado" });
      }

      // Si se cambia el email, verificar que no esté en uso
      if (email) {
        const { data: emailExists } = await supabase
          .from("users")
          .select("id")
          .eq("email", email)
          .neq("id", id)
          .single();

        if (emailExists) {
          return res.status(400).json({ error: "El email ya está en uso" });
        }
      }

      // Actualizar el administrador
      const { data, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", id)
        .eq("role", "admin")
        .select()
        .single();

      if (error) {
        console.error("❌ Error actualizando administrador:", error);
        return res.status(500).json({ error: "Error actualizando administrador" });
      }

      // Transformar datos para la respuesta
      const admin = {
        id: data.id,
        nombre: data.full_name,
        email: data.email,
        telefono: data.phone || '',
        rol: data.role,
        provincia: data.provincia || '',
        canton: data.canton || '',
        distrito: data.distrito || '',
        fechaCreacion: data.created_at,
        activo: true
      };

      return res.status(200).json({
        success: true,
        data: admin,
        message: "Administrador actualizado exitosamente"
      });

    } catch (error) {
      console.error("❌ Error actualizando administrador:", error);
      return res.status(500).json({ 
        error: "Error interno del servidor",
        details: error.message
      });
    }
  }

  // DELETE - Eliminar administrador
  if (req.method === "DELETE") {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: "ID es requerido" });
      }

      // Verificar que el administrador existe
      const { data: existingAdmin } = await supabase
        .from("users")
        .select("id")
        .eq("id", id)
        .eq("role", "admin")
        .single();

      if (!existingAdmin) {
        return res.status(404).json({ error: "Administrador no encontrado" });
      }

      // Eliminar el administrador
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", id)
        .eq("role", "admin");

      if (error) {
        console.error("❌ Error eliminando administrador:", error);
        return res.status(500).json({ error: "Error eliminando administrador" });
      }

      return res.status(200).json({
        success: true,
        message: "Administrador eliminado exitosamente"
      });

    } catch (error) {
      console.error("❌ Error eliminando administrador:", error);
      return res.status(500).json({ 
        error: "Error interno del servidor",
        details: error.message
      });
    }
  }

  // Método no permitido
  return res.status(405).json({ error: "Método no permitido" });
}
