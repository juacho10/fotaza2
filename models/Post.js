const pool = require('../config/db');

class Post {
    constructor(data) {
        this.id = data.id;
        this.title = data.title;
        this.description = data.description;
        this.genre = data.genre;
        this.tags = data.tags;
        this.user_id = data.user_id;
        this.username = data.username;
        this.comments_open = data.comments_open !== undefined ? data.comments_open : true;
        this.is_reported = data.is_reported || false;
        this.is_banned = data.is_banned || false;
        this.report_count = data.report_count || 0;
        this.created_at = data.created_at;
        this.deleted_at = data.deleted_at;
        this.avg_rating = parseFloat(data.avg_rating) || 0;
        this.rating_count = data.rating_count || 0;
    }

    static async create(postData) {
        const { title, description, genre, tags, user_id } = postData;
        const [result] = await pool.query(
            'INSERT INTO posts (title, description, genre, tags, user_id) VALUES (?, ?, ?, ?, ?)',
            [title, description, genre || null, tags, user_id]
        );
        return result.insertId;
    }

    static async findById(id) {
        const [rows] = await pool.query(`
            SELECT p.*, u.username
            FROM posts p 
            JOIN users u ON p.user_id = u.id 
            WHERE p.id = ? AND p.deleted_at IS NULL AND p.is_banned = FALSE
        `, [id]);
        if (rows.length === 0) return null;
        return new Post(rows[0]);
    }

    static async findAllHome(limit = 20, offset = 0) {
        // Balance: 70% mejor valoradas (con mínimo 3 votos), 30% recientes
        const [bestRated] = await pool.query(`
            SELECT p.*, u.username
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.deleted_at IS NULL AND p.is_banned = FALSE
              AND p.rating_count >= 3
            ORDER BY p.avg_rating DESC, p.rating_count DESC
            LIMIT ?
        `, [Math.floor(limit * 0.7)]);
        
        const [recent] = await pool.query(`
            SELECT p.*, u.username
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.deleted_at IS NULL AND p.is_banned = FALSE
            ORDER BY p.created_at DESC
            LIMIT ?
        `, [limit - Math.floor(limit * 0.7)]);
        
        // Combinar y eliminar duplicados
        const all = [...bestRated, ...recent];
        const unique = [];
        const ids = new Set();
        for (const post of all) {
            if (!ids.has(post.id)) {
                ids.add(post.id);
                unique.push(post);
            }
        }
        return unique.map(row => new Post(row));
    }

    static async findByUser(userId) {
        const [rows] = await pool.query(`
            SELECT p.*, u.username
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.user_id = ? AND p.deleted_at IS NULL AND p.is_banned = FALSE
            ORDER BY p.created_at DESC
        `, [userId]);
        return rows.map(row => new Post(row));
    }

    static async findByUsers(userIds) {
        if (!userIds || userIds.length === 0) return [];
        const placeholders = userIds.map(() => '?').join(',');
        const [rows] = await pool.query(`
            SELECT p.*, u.username
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.user_id IN (${placeholders}) 
              AND p.deleted_at IS NULL 
              AND p.is_banned = FALSE
            ORDER BY p.created_at DESC
        `, userIds);
        return rows.map(row => new Post(row));
    }

    static async search(filters, limit = 20, offset = 0) {
        let sql = `
            SELECT p.*, u.username
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.deleted_at IS NULL AND p.is_banned = FALSE
        `;
        const params = [];
        
        if (filters.query) {
            sql += ` AND (p.title LIKE ? OR p.description LIKE ? OR p.tags LIKE ?)`;
            const like = `%${filters.query}%`;
            params.push(like, like, like);
        }
        
        if (filters.author) {
            sql += ` AND u.username LIKE ?`;
            params.push(`%${filters.author}%`);
        }
        
        if (filters.tag) {
            sql += ` AND p.tags LIKE ?`;
            params.push(`%${filters.tag}%`);
        }
        
        if (filters.genre) {
            sql += ` AND p.genre = ?`;
            params.push(filters.genre);
        }
        
        sql += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);
        
        const [rows] = await pool.query(sql, params);
        
        // Contar total
        let countSql = `
            SELECT COUNT(DISTINCT p.id) as total
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.deleted_at IS NULL AND p.is_banned = FALSE
        `;
        const countParams = [];
        
        if (filters.query) {
            countSql += ` AND (p.title LIKE ? OR p.description LIKE ? OR p.tags LIKE ?)`;
            const like = `%${filters.query}%`;
            countParams.push(like, like, like);
        }
        if (filters.author) {
            countSql += ` AND u.username LIKE ?`;
            countParams.push(`%${filters.author}%`);
        }
        if (filters.tag) {
            countSql += ` AND p.tags LIKE ?`;
            countParams.push(`%${filters.tag}%`);
        }
        if (filters.genre) {
            countSql += ` AND p.genre = ?`;
            countParams.push(filters.genre);
        }
        
        const [countRows] = await pool.query(countSql, countParams);
        
        return {
            posts: rows.map(row => new Post(row)),
            total: countRows[0].total
        };
    }

    async update(data) {
        if (this.is_reported) {
            throw new Error('Esta publicación ha sido denunciada y no puede ser modificada');
        }
        
        const { title, description, genre, tags, comments_open } = data;
        await pool.query(
            'UPDATE posts SET title = ?, description = ?, genre = ?, tags = ?, comments_open = ? WHERE id = ?',
            [title || this.title, description || this.description, genre || this.genre, tags || this.tags, 
             comments_open !== undefined ? comments_open : this.comments_open, this.id]
        );
        if (title) this.title = title;
        if (description) this.description = description;
        if (genre) this.genre = genre;
        if (tags) this.tags = tags;
        if (comments_open !== undefined) this.comments_open = comments_open;
    }

    async softDelete() {
        await pool.query('UPDATE posts SET deleted_at = NOW() WHERE id = ?', [this.id]);
        this.deleted_at = new Date();
    }

    async ban() {
        await pool.query('UPDATE posts SET is_banned = TRUE WHERE id = ?', [this.id]);
        this.is_banned = true;
    }

    async toggleComments() {
        await pool.query('UPDATE posts SET comments_open = NOT comments_open WHERE id = ?', [this.id]);
        this.comments_open = !this.comments_open;
    }

    async addImage(filePath, license, watermarkText = null) {
        const [result] = await pool.query(
            'INSERT INTO images (post_id, file_path, license, watermark_text) VALUES (?, ?, ?, ?)',
            [this.id, filePath, license || 'free', watermarkText]
        );
        return result.insertId;
    }

    async addVideo(filePath, thumbnailPath = null, duration = 0) {
        const [result] = await pool.query(
            'INSERT INTO videos (post_id, file_path, thumbnail_path, duration) VALUES (?, ?, ?, ?)',
            [this.id, filePath, thumbnailPath, duration]
        );
        return result.insertId;
    }

    async getImages() {
        const [rows] = await pool.query('SELECT * FROM images WHERE post_id = ?', [this.id]);
        const Image = require('./Image');
        return rows.map(row => new Image(row));
    }

    async getVideos() {
        const [rows] = await pool.query('SELECT * FROM videos WHERE post_id = ?', [this.id]);
        return rows;
    }

    async addComment(userId, content) {
        const [result] = await pool.query(
            'INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)',
            [userId, this.id, content]
        );
        
        const Notification = require('./Notification');
        await Notification.create(this.user_id, 'comment', userId, null, this.id);
        
        return result.insertId;
    }

    async getComments() {
        const Comment = require('./Comment');
        return await Comment.findByPost(this.id);
    }

    async hasInterest(userId, imageId = null) {
        let query = 'SELECT 1 FROM interests WHERE user_id = ? AND post_id = ?';
        const params = [userId, this.id];
        if (imageId) {
            query += ' AND image_id = ?';
            params.push(imageId);
        }
        const [rows] = await pool.query(query, params);
        return rows.length > 0;
    }

    async markInterest(userId, imageId = null) {
        if (this.user_id === userId) {
            throw new Error('No puedes marcar interés en tu propia publicación');
        }
        
        try {
            await pool.query(
                'INSERT INTO interests (user_id, post_id, image_id) VALUES (?, ?, ?)',
                [userId, this.id, imageId]
            );
            
            const Notification = require('./Notification');
            await Notification.create(this.user_id, 'interest', userId, imageId, this.id);
            
            return true;
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Ya has marcado interés en esta publicación');
            }
            throw error;
        }
    }

    async report(userId, reason, description) {
        const Report = require('./Report');
        await Report.create(userId, this.id, null, reason, description);
        
        await pool.query('UPDATE posts SET report_count = report_count + 1 WHERE id = ?', [this.id]);
        this.report_count++;
        
        const [rows] = await pool.query(
            'SELECT COUNT(DISTINCT user_id) as count FROM reports WHERE post_id = ? AND status = "pending"',
            [this.id]
        );
        
        if (rows[0].count >= 3) {
            await pool.query('UPDATE posts SET is_reported = TRUE WHERE id = ?', [this.id]);
            this.is_reported = true;
        }
    }

    async getReportCount() {
        const [rows] = await pool.query('SELECT COUNT(DISTINCT user_id) as count FROM reports WHERE post_id = ?', [this.id]);
        return rows[0].count;
    }
}

module.exports = Post;