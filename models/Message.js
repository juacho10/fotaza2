const pool = require('../config/db');
const Notification = require('./Notification');

class Message {
    constructor(data) {
        this.id = data.id;
        this.sender_id = data.sender_id;
        this.receiver_id = data.receiver_id;
        this.subject = data.subject;
        this.content = data.content;
        this.is_read = data.is_read || false;
        this.created_at = data.created_at;
        this.sender_username = data.sender_username;
        this.receiver_username = data.receiver_username;
    }

    // Crear mensaje
    static async create(senderId, receiverId, subject, content) {
        const [result] = await pool.query(
            `INSERT INTO messages (sender_id, receiver_id, subject, content) 
             VALUES (?, ?, ?, ?)`,
            [senderId, receiverId, subject, content]
        );
        
        await Notification.create(
            receiverId,
            'message',
            senderId,
            null,
            null,
            result.insertId
        );
        
        return result.insertId;
    }

    // Obtener mensajes por usuario
    static async findByUser(userId, limit = 50) {
        const [rows] = await pool.query(`
            SELECT m.*, 
                   u1.username as sender_username,
                   u2.username as receiver_username
            FROM messages m
            JOIN users u1 ON m.sender_id = u1.id
            JOIN users u2 ON m.receiver_id = u2.id
            WHERE m.sender_id = ? OR m.receiver_id = ?
            ORDER BY m.created_at DESC
            LIMIT ?
        `, [userId, userId, limit]);
        return rows.map(row => new Message(row));
    }

    // Obtener conversación entre dos usuarios
    static async findConversation(userId1, userId2, limit = 50) {
        const [rows] = await pool.query(`
            SELECT m.*, 
                   u1.username as sender_username,
                   u2.username as receiver_username
            FROM messages m
            JOIN users u1 ON m.sender_id = u1.id
            JOIN users u2 ON m.receiver_id = u2.id
            WHERE (m.sender_id = ? AND m.receiver_id = ?) 
               OR (m.sender_id = ? AND m.receiver_id = ?)
            ORDER BY m.created_at ASC
            LIMIT ?
        `, [userId1, userId2, userId2, userId1, limit]);
        return rows.map(row => new Message(row));
    }

    // Buscar por ID
    static async findById(id) {
        const [rows] = await pool.query(`
            SELECT m.*, 
                   u1.username as sender_username,
                   u2.username as receiver_username
            FROM messages m
            JOIN users u1 ON m.sender_id = u1.id
            JOIN users u2 ON m.receiver_id = u2.id
            WHERE m.id = ?
        `, [id]);
        if (rows.length === 0) return null;
        return new Message(rows[0]);
    }

    // Marcar como leído
    async markAsRead() {
        if (!this.is_read && this.receiver_id) {
            await pool.query(
                'UPDATE messages SET is_read = TRUE WHERE id = ?',
                [this.id]
            );
            this.is_read = true;
        }
    }

    // Contar mensajes no leídos
    static async getUnreadCount(userId) {
        const [rows] = await pool.query(
            'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = FALSE',
            [userId]
        );
        return rows[0].count;
    }

    // Eliminar mensaje
    async delete() {
        await pool.query(
            'DELETE FROM messages WHERE id = ?',
            [this.id]
        );
    }
}

module.exports = Message;
