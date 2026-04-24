const pool = require('../config/db');

class Report {
    constructor(data) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.post_id = data.post_id;
        this.comment_id = data.comment_id;
        this.reason = data.reason;
        this.description = data.description;
        this.status = data.status;
        this.created_at = data.created_at;
        this.reviewed_by = data.reviewed_by;
        this.reviewed_at = data.reviewed_at;
        this.reporter_username = data.reporter_username;
        this.post_title = data.post_title;
        this.comment_content = data.comment_content;
    }

    // Obtener denuncias pendientes
    static async findPending() {
        const [rows] = await pool.query(`
            SELECT r.*, 
                   u.username as reporter_username,
                   p.title as post_title,
                   c.content as comment_content
            FROM reports r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN posts p ON r.post_id = p.id
            LEFT JOIN comments c ON r.comment_id = c.id
            WHERE r.status = 'pending'
            ORDER BY r.created_at ASC
        `);
        return rows.map(row => new Report(row));
    }

    // Buscar por ID
    static async findById(id) {
        const [rows] = await pool.query(`
            SELECT r.*, u.username as reporter_username
            FROM reports r
            JOIN users u ON r.user_id = u.id
            WHERE r.id = ?
        `, [id]);
        if (rows.length === 0) return null;
        return new Report(rows[0]);
    }

    // Crear denuncia
    static async create(userId, postId, commentId, reason, description) {
        const [result] = await pool.query(
            `INSERT INTO reports (user_id, post_id, comment_id, reason, description) 
             VALUES (?, ?, ?, ?, ?)`,
            [userId, postId, commentId, reason, description]
        );
        return result.insertId;
    }

    // Marcar como revisada
    async markAsReviewed(status, reviewerId) {
        await pool.query(
            `UPDATE reports SET status = ?, reviewed_by = ?, reviewed_at = NOW() 
             WHERE id = ?`,
            [status, reviewerId, this.id]
        );
        this.status = status;
        this.reviewed_by = reviewerId;
        this.reviewed_at = new Date();
    }

    // Obtener publicación asociada
    async getPost() {
        if (!this.post_id) return null;
        const Post = require('./Post');
        return await Post.findById(this.post_id);
    }

    // Obtener comentario asociado
    async getComment() {
        if (!this.comment_id) return null;
        const Comment = require('./Comment');
        return await Comment.findById(this.comment_id);
    }
}

module.exports = Report;
