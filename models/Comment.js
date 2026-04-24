const pool = require('../config/db');

class Comment {
    constructor(data) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.post_id = data.post_id;
        this.content = data.content;
        this.is_reported = data.is_reported || false;
        this.is_banned = data.is_banned || false;
        this.created_at = data.created_at;
        this.deleted_at = data.deleted_at;
        this.username = data.username;
    }

    // Buscar por ID
    static async findById(id) {
        const [rows] = await pool.query(`
            SELECT c.*, u.username 
            FROM comments c 
            JOIN users u ON c.user_id = u.id 
            WHERE c.id = ? AND c.deleted_at IS NULL AND c.is_banned = FALSE
        `, [id]);
        if (rows.length === 0) return null;
        return new Comment(rows[0]);
    }

    // Buscar comentarios por publicación
    static async findByPost(postId) {
        const [rows] = await pool.query(`
            SELECT c.*, u.username 
            FROM comments c 
            JOIN users u ON c.user_id = u.id 
            WHERE c.post_id = ? AND c.deleted_at IS NULL AND c.is_banned = FALSE
            ORDER BY c.created_at ASC
        `, [postId]);
        return rows.map(row => new Comment(row));
    }

    // Borrado lógico
    async softDelete() {
        await pool.query(
            'UPDATE comments SET deleted_at = NOW() WHERE id = ?',
            [this.id]
        );
        this.deleted_at = new Date();
    }

    // Banear comentario
    async ban() {
        await pool.query(
            'UPDATE comments SET is_banned = TRUE WHERE id = ?',
            [this.id]
        );
        this.is_banned = true;
    }

    // Denunciar comentario
    async report(userId, reason, description) {
        const Report = require('./Report');
        await Report.create(userId, null, this.id, reason, description);
        
        await pool.query(
            'UPDATE comments SET is_reported = TRUE WHERE id = ?',
            [this.id]
        );
        this.is_reported = true;
    }
}

module.exports = Comment;
