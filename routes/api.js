const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/authMiddleware');
const Collection = require('../models/Collection');
const User = require('../models/User');
const Notification = require('../models/Notification');
const pool = require('../config/db');

// Buscar usuarios (para el selector de mensajes)
router.get('/users/search', isAuthenticated, async (req, res) => {
    console.log('📌 API BUSCAR USUARIOS - Query:', req.query.q);
    try {
        const { q } = req.query;
        let users = [];
        
        if (q && q.trim() !== '') {
            users = await User.search(q, 20);
        } else {
            // Si no hay búsqueda, traer los últimos 20 usuarios (excepto el actual)
            const [rows] = await pool.query(
                `SELECT id, username, email, role, created_at 
                 FROM users 
                 WHERE id != ? AND deleted_at IS NULL AND is_active = 1 
                 ORDER BY username ASC 
                 LIMIT 20`,
                [req.session.userId]
            );
            users = rows;
        }
        
        console.log('   Usuarios encontrados:', users.length);
        res.json({ users: users || [] });
    } catch (error) {
        console.error('❌ Error en search users:', error);
        res.status(500).json({ error: 'Error al buscar usuarios', users: [] });
    }
});

router.get('/collections/:id/posts', isAuthenticated, async (req, res) => {
    try {
        const collection = await Collection.findById(req.params.id);
        
        if (!collection || collection.user_id !== req.session.userId) {
            return res.status(403).json({ error: 'No autorizado' });
        }
        
        const posts = await collection.getPosts();
        res.json(posts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener publicaciones' });
    }
});

router.get('/notifications/unread-count', isAuthenticated, async (req, res) => {
    try {
        const count = await Notification.getUnreadCount(req.session.userId);
        res.json({ count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener contador' });
    }
});

module.exports = router;