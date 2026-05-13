const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/authMiddleware');
const Collection = require('../models/Collection');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const pool = require('../config/db');

// ========== ENDPOINT /users/search ==========
router.get('/users/search', isAuthenticated, async (req, res) => {
    console.log('📌 API BUSCAR USUARIOS - Query:', req.query.q);
    try {
        const { q } = req.query;
        let users = [];
        
        if (q && q.trim() !== '') {
            users = await User.search(q, 20);
        } else {
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
        
        res.json({ users: users || [] });
    } catch (error) {
        console.error('❌ Error en search users:', error);
        res.status(500).json({ error: 'Error al buscar usuarios', users: [] });
    }
});

// ========== ENDPOINT PARA COLECCIONES ==========
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

// ========== ENDPOINT PARA CONTADOR DE NOTIFICACIONES ==========
router.get('/notifications/unread-count', isAuthenticated, async (req, res) => {
    try {
        const count = await Notification.getUnreadCount(req.session.userId);
        res.json({ count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener contador de notificaciones' });
    }
});

// ========== ENDPOINT PARA CONTADOR DE MENSAJES NO LEÍDOS ==========
router.get('/messages/unread-count', isAuthenticated, async (req, res) => {
    try {
        const count = await Message.getUnreadCount(req.session.userId);
        res.json({ count });
    } catch (error) {
        console.error('Error al obtener contador de mensajes:', error);
        res.status(500).json({ error: 'Error al obtener contador de mensajes' });
    }
});

module.exports = router;