const pool = require('../config/db');

class Report {
    constructor(data, type = 'post') {
        this.id = data.id;
        this.type = type; // 'post' o 'comment'
        this.user_id = data.user_id;
        this.post_id = data.post_id || null;
        this.comment_id = data.comment_id || null;
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

    // Obtener TODAS las denuncias pendientes (publicaciones + comentarios)
    static async findPending() {
        // Denuncias de PUBLICACIONES (tabla reports)
        const [postReports] = await pool.query(`
            SELECT r.*, 
                   'post' as report_type,
                   u.username as reporter_username,
                   p.title as post_title,
                   NULL as comment_content,
                   NULL as comment_id
            FROM reports r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN posts p ON r.post_id = p.id
            WHERE r.status = 'pending'
        `);

        // Denuncias de COMENTARIOS (tabla comment_reports)
        const [commentReports] = await pool.query(`
            SELECT cr.*, 
                   'comment' as report_type,
                   u.username as reporter_username,
                   p.title as post_title,
                   c.content as comment_content,
                   cr.comment_id
            FROM comment_reports cr
            JOIN users u ON cr.reporter_id = u.id
            LEFT JOIN comments c ON cr.comment_id = c.id
            LEFT JOIN posts p ON c.post_id = p.id
            WHERE cr.status = 'pending'
        `);

        // Combinar ambos resultados
        const allReports = [
            ...postReports.map(row => new Report(row, 'post')),
            ...commentReports.map(row => new Report(row, 'comment'))
        ];

        // Ordenar por fecha (más recientes primero)
        allReports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return allReports;
    }

    // Buscar por ID (busca en ambas tablas)
    static async findById(id) {
        // Primero buscar en reports (publicaciones)
        let [rows] = await pool.query(`
            SELECT r.*, 'post' as report_type, u.username as reporter_username
            FROM reports r
            JOIN users u ON r.user_id = u.id
            WHERE r.id = ?
        `, [id]);
        
        if (rows.length > 0) {
            const row = rows[0];
            const [postRows] = await pool.query(`SELECT title FROM posts WHERE id = ?`, [row.post_id]);
            row.post_title = postRows[0]?.title || null;
            return new Report(row, 'post');
        }
        
        // Buscar en comment_reports (comentarios)
        [rows] = await pool.query(`
            SELECT cr.*, 'comment' as report_type, u.username as reporter_username,
                   c.content as comment_content, c.post_id
            FROM comment_reports cr
            JOIN users u ON cr.reporter_id = u.id
            LEFT JOIN comments c ON cr.comment_id = c.id
            WHERE cr.id = ?
        `, [id]);
        
        if (rows.length > 0) {
            const row = rows[0];
            const [postRows] = await pool.query(`SELECT title FROM posts WHERE id = ?`, [row.post_id]);
            row.post_title = postRows[0]?.title || null;
            return new Report(row, 'comment');
        }
        
        return null;
    }

    // Crear denuncia de PUBLICACIÓN
    static async createPostReport(userId, postId, reason, description) {
        const [result] = await pool.query(
            `INSERT INTO reports (user_id, post_id, reason, description) 
             VALUES (?, ?, ?, ?)`,
            [userId, postId, reason, description]
        );
        return result.insertId;
    }

    // Crear denuncia de COMENTARIO
    static async createCommentReport(userId, commentId, reason, description) {
        const [result] = await pool.query(
            `INSERT INTO comment_reports (comment_id, reporter_id, reason, description) 
             VALUES (?, ?, ?, ?)`,
            [commentId, userId, reason, description]
        );
        return result.insertId;
    }

    // Marcar como revisada (según el tipo)
    async markAsReviewed(status, reviewerId) {
        if (this.type === 'post') {
            await pool.query(
                `UPDATE reports SET status = ?, reviewed_by = ?, reviewed_at = NOW() 
                 WHERE id = ?`,
                [status, reviewerId, this.id]
            );
        } else {
            await pool.query(
                `UPDATE comment_reports SET status = ?, reviewed_by = ?, reviewed_at = NOW() 
                 WHERE id = ?`,
                [status, reviewerId, this.id]
            );
        }
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
        if (!this.comment_id || this.type !== 'comment') return null;
        const Comment = require('./Comment');
        return await Comment.findById(this.comment_id);
    }
}

module.exports = Report;