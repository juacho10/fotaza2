const pool = require('../config/db');

class Notification {
    constructor(data) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.type = data.type;
        this.source_user_id = data.source_user_id;
        this.source_username = data.source_username;
        this.image_id = data.image_id;
        this.post_id = data.post_id;
        this.message_id = data.message_id;
        this.is_read = data.is_read || false;
        this.created_at = data.created_at;
        this.post_title = data.post_title;
        this.message_subject = data.message_subject;
    }

    // Crear notificación
    static async create(userId, type, sourceUserId, imageId = null, postId = null, messageId = null, customMessage = null) {
    const [result] = await pool.query(
        `INSERT INTO notifications (user_id, type, source_user_id, image_id, post_id, message_id, custom_message) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, type, sourceUserId, imageId, postId, messageId, customMessage]
    );
    return result.insertId;
}

    // Obtener notificaciones por usuario
    static async findByUser(userId, limit = 50) {
        const [rows] = await pool.query(`
            SELECT n.*, u.username as source_username,
                   p.title as post_title,
                   m.subject as message_subject
            FROM notifications n
            JOIN users u ON n.source_user_id = u.id
            LEFT JOIN posts p ON n.post_id = p.id
            LEFT JOIN messages m ON n.message_id = m.id
            WHERE n.user_id = ?
            ORDER BY n.created_at DESC
            LIMIT ?
        `, [userId, limit]);
        return rows.map(row => new Notification(row));
    }

    // Buscar por ID
    static async findById(id) {
        const [rows] = await pool.query(`
            SELECT n.*, u.username as source_username
            FROM notifications n
            JOIN users u ON n.source_user_id = u.id
            WHERE n.id = ?
        `, [id]);
        if (rows.length === 0) return null;
        return new Notification(rows[0]);
    }

    // Marcar como leída
    async markAsRead() {
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = ?',
            [this.id]
        );
        this.is_read = true;
    }

    // Marcar todas como leídas
    static async markAllAsRead(userId) {
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );
    }

    // Obtener contador de no leídas
    static async getUnreadCount(userId) {
        const [rows] = await pool.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );
        return rows[0].count;
    }
}

module.exports = Notification;
