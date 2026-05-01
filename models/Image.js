const pool = require('../config/db');
const Notification = require('./Notification');

class Image {
    constructor(data) {
        this.id = data.id;
        this.post_id = data.post_id;
        this.file_path = data.file_path;
        this.license = data.license;
        this.watermark_text = data.watermark_text;
        this.average_rating = parseFloat(data.average_rating) || 0;
        this.rating_count = data.rating_count || 0;
        this.created_at = data.created_at;
    }

    static async findById(id) {
        const [rows] = await pool.query('SELECT * FROM images WHERE id = ?', [id]);
        if (rows.length === 0) return null;
        return new Image(rows[0]);
    }

    static async findByPost(postId) {
        const [rows] = await pool.query('SELECT * FROM images WHERE post_id = ?', [postId]);
        return rows.map(row => new Image(row));
    }

    static async getUserRatingForPost(userId, postId) {
        const [rows] = await pool.query(`
            SELECT r.value 
            FROM ratings r
            JOIN images i ON r.image_id = i.id
            WHERE r.user_id = ? AND i.post_id = ?
            LIMIT 1
        `, [userId, postId]);
        return rows.length > 0 ? rows[0].value : null;
    }

    async addRating(userId, value) {
        const [postRows] = await pool.query('SELECT user_id FROM posts WHERE id = ?', [this.post_id]);
        
        if (postRows[0] && postRows[0].user_id === userId) {
            throw new Error('No puedes valorar tu propia imagen');
        }
        
        try {
            await pool.query(
                'INSERT INTO ratings (user_id, image_id, value) VALUES (?, ?, ?)',
                [userId, this.id, value]
            );
            
            await this.updateAverageRating();
            
            await Notification.create(postRows[0].user_id, 'rating', userId, this.id, this.post_id);
            
            return true;
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Ya has valorado esta imagen');
            }
            throw error;
        }
    }

    async updateAverageRating() {
        // CORREGIDO: Usar AVG de valoraciones directamente
        const [rows] = await pool.query(`
            SELECT AVG(r.value) as avg, COUNT(r.id) as count 
            FROM ratings r 
            WHERE r.image_id = ?
        `, [this.id]);
        
        const avg = rows[0].avg ? parseFloat(rows[0].avg) : 0;
        const count = rows[0].count || 0;
        
        await pool.query(
            'UPDATE images SET average_rating = ?, rating_count = ? WHERE id = ?',
            [avg, count, this.id]
        );
        
        this.average_rating = avg;
        this.rating_count = count;
        
        await this.updatePostAverageRating();
    }

    async updatePostAverageRating() {
        // CORREGIDO: Calcular promedio de la publicación desde las valoraciones individuales
        const [rows] = await pool.query(`
            SELECT AVG(r.value) as avg, COUNT(r.id) as count 
            FROM ratings r 
            JOIN images i ON r.image_id = i.id 
            WHERE i.post_id = ?
        `, [this.post_id]);
        
        await pool.query(
            'UPDATE posts SET avg_rating = ?, rating_count = ? WHERE id = ?',
            [rows[0].avg || 0, rows[0].count || 0, this.post_id]
        );
    }

    async markInterest(userId) {
        const [postRows] = await pool.query('SELECT user_id FROM posts WHERE id = ?', [this.post_id]);
        
        if (postRows[0] && postRows[0].user_id === userId) {
            throw new Error('No puedes marcar interés en tu propia imagen');
        }
        
        try {
            await pool.query(
                'INSERT INTO interests (user_id, post_id, image_id) VALUES (?, ?, ?)',
                [userId, this.post_id, this.id]
            );
            
            await Notification.create(postRows[0].user_id, 'interest', userId, this.id, this.post_id);
            
            return true;
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Ya has marcado interés en esta imagen');
            }
            throw error;
        }
    }
}

module.exports = Image;