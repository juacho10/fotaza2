const pool = require('../config/db');
const Notification = require('./Notification');

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

    static async findReportedByUser(userId) {
        const [rows] = await pool.query(`
            SELECT cr.*, c.content, c.user_id as comment_author_id, c.post_id,
                   u.username as reporter_username
            FROM comment_reports cr
            JOIN comments c ON cr.comment_id = c.id
            JOIN users u ON cr.reporter_id = u.id
            WHERE c.user_id = ? AND cr.status = 'pending'
            ORDER BY cr.created_at DESC
        `, [userId]);
        return rows;
    }

    async softDelete() {
        await pool.query('UPDATE comments SET deleted_at = NOW() WHERE id = ?', [this.id]);
        this.deleted_at = new Date();
    }

    async ban() {
        await pool.query('UPDATE comments SET is_banned = TRUE WHERE id = ?', [this.id]);
        this.is_banned = true;
    }

    async report(userId, reason, description) {
        try {
            const [result] = await pool.query(
                `INSERT INTO comment_reports (comment_id, reporter_id, reason, description) 
                 VALUES (?, ?, ?, ?)`,
                [this.id, userId, reason, description || null]
            );
            
            await pool.query('UPDATE comments SET is_reported = TRUE WHERE id = ?', [this.id]);
            this.is_reported = true;
            
            // Notificar al autor del comentario
            await Notification.create(
                this.user_id,
                'comment_reported',
                userId,
                null,
                this.post_id,
                null,
                this.id
            );
            
            return result.insertId;
        } catch (error) {
            console.error('Error al reportar comentario:', error);
            throw error;
        }
    }

    async getReports() {
        const [rows] = await pool.query(`
            SELECT cr.*, u.username as reporter_username
            FROM comment_reports cr
            JOIN users u ON cr.reporter_id = u.id
            WHERE cr.comment_id = ? AND cr.status = 'pending'
        `, [this.id]);
        return rows;
    }
}

module.exports = Comment;