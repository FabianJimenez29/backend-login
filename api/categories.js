const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const cors = require('cors');

// Configuración de la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Middleware para CORS
router.use(cors({
  origin: ['http://localhost:3000', 'https://admin-panel-tawny-seven.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

/**
 * @route GET /api/categories
 * @desc Obtener todas las categorías
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ message: 'Error al obtener categorías', error: error.message });
  }
});

/**
 * @route GET /api/categories/:id
 * @desc Obtener una categoría por ID
 * @access Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener categoría:', error);
    res.status(500).json({ message: 'Error al obtener categoría', error: error.message });
  }
});

/**
 * @route POST /api/categories
 * @desc Crear una nueva categoría
 * @access Private
 */
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'El nombre de la categoría es requerido' });
    }
    
    const result = await pool.query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || '']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear categoría:', error);
    res.status(500).json({ message: 'Error al crear categoría', error: error.message });
  }
});

/**
 * @route PUT /api/categories/:id
 * @desc Actualizar una categoría
 * @access Private
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'El nombre de la categoría es requerido' });
    }
    
    const result = await pool.query(
      'UPDATE categories SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name, description || '', id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    res.status(500).json({ message: 'Error al actualizar categoría', error: error.message });
  }
});

/**
 * @route DELETE /api/categories/:id
 * @desc Eliminar una categoría
 * @access Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si hay productos asociados a esta categoría
    const productsCheck = await pool.query('SELECT COUNT(*) FROM products WHERE category_id = $1', [id]);
    const productCount = parseInt(productsCheck.rows[0].count);
    
    if (productCount > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar esta categoría porque tiene productos asociados',
        productCount
      });
    }
    
    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }
    
    res.json({ message: 'Categoría eliminada correctamente', category: result.rows[0] });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({ message: 'Error al eliminar categoría', error: error.message });
  }
});

module.exports = router;
