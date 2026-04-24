
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
    constructor(data) {
        this.id = data.id;
        this.username = data.username;
        this.email = data.email;
        this.password = data.password;
        this.role = data.role || 'user';
        this.is_active = data.is_active !== undefined ? data.is_active : true;
        this.banned_posts_count = data.banned_posts_count || 0;
        this.created_at = data.created_at;
        this.deleted_at = data.deleted_at;
    }

    // Crear nuevo usuario
    static async create(userData) {
        const { username, email, password } = userData;
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );
        return result.insertId;
    }

    // Buscar por email
    static async findByEmail(email) {
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL',
            [email]
        );
        if (rows.length === 0) return null;
        return new User(rows[0]);
    }

    // Buscar por ID
    static async findById(id) {
        const [rows] = await pool.query(
            'SELECT id, username, email, role, is_active, banned_posts_count, created_at FROM users WHERE id = ? AND deleted_at IS NULL',
            [id]
        );
        if (rows.length === 0) return null;
        return new User(rows[0]);
    }

    // Buscar por username
    static async findByUsername(username) {
        const [rows] = await pool.query(
            'SELECT id, username, email, role, is_active, created_at FROM users WHERE username = ? AND deleted_at IS NULL',
            [username]
        );
        if (rows.length === 0) return null;
        return new User(rows[0]);
    }

    // Buscar usuarios (para autocompletado)
    static async search(query, limit = 10) {
        const [rows] = await pool.query(
            `SELECT id, username, email, role, created_at 
             FROM users 
             WHERE username LIKE ? AND deleted_at IS NULL 
             LIMIT ?`,
            [`%${query}%`, limit]
        );
        return rows;
    }

    // Verificar contraseña
    async verifyPassword(password) {
        return bcrypt.compare(password, this.password);
    }

    // Seguir a otro usuario
    async follow(userIdToFollow) {
        if (this.id === userIdToFollow) {
            throw new Error('No puedes seguirte a ti mismo');
        }
        try {
            await pool.query(
                'INSERT INTO follows (follower_id, followed_id) VALUES (?, ?)',
                [this.id, userIdToFollow]
            );
            const Notification = require('./Notification');
            await Notification.create(
                userIdToFollow,
                'follow',
                this.id,
                null,
                null
            );
            return true;
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Ya sigues a este usuario');
            }
            throw error;
        }
    }

    // Dejar de seguir
    async unfollow(userIdToUnfollow) {
        const [result] = await pool.query(
            'DELETE FROM follows WHERE follower_id = ? AND followed_id = ?',
            [this.id, userIdToUnfollow]
        );
        return result.affectedRows > 0;
    }

    // Contar seguidores
    static async getFollowersCount(userId) {
        const [rows] = await pool.query(
            'SELECT COUNT(*) as count FROM follows WHERE followed_id = ?',
            [userId]
        );
        return rows[0].count;
    }

    // Contar seguidos
    static async getFollowingCount(userId) {
        const [rows] = await pool.query(
            'SELECT COUNT(*) as count FROM follows WHERE follower_id = ?',
            [userId]
        );
        return rows[0].count;
    }

    // Obtener lista de seguidores
    static async getFollowers(userId, limit = 20) {
        const [rows] = await pool.query(
            `SELECT u.id, u.username, u.email 
             FROM follows f 
             JOIN users u ON f.follower_id = u.id 
             WHERE f.followed_id = ? AND u.deleted_at IS NULL 
             LIMIT ?`,
            [userId, limit]
        );
        return rows;
    }

    // Obtener lista de seguidos
    static async getFollowing(userId, limit = 20) {
        const [rows] = await pool.query(
            `SELECT u.id, u.username, u.email 
             FROM follows f 
             JOIN users u ON f.followed_id = u.id 
             WHERE f.follower_id = ? AND u.deleted_at IS NULL 
             LIMIT ?`,
            [userId, limit]
        );
        return rows;
    }

    // Verificar si sigue a otro usuario
    static async isFollowing(followerId, followedId) {
        const [rows] = await pool.query(
            'SELECT 1 FROM follows WHERE follower_id = ? AND followed_id = ?',
            [followerId, followedId]
        );
        return rows.length > 0;
    }

    // Incrementar contador de publicaciones bajadas
    async incrementBannedPosts() {
        await pool.query(
            'UPDATE users SET banned_posts_count = banned_posts_count + 1 WHERE id = ?',
            [this.id]
        );
        this.banned_posts_count++;
        
        if (this.banned_posts_count >= 3) {
            await this.deactivate();
        }
    }

    // Desactivar cuenta
    async deactivate() {
        await pool.query(
            'UPDATE users SET is_active = FALSE WHERE id = ?',
            [this.id]
        );
        this.is_active = false;
    }

    // Reactivar cuenta
    async reactivate() {
        await pool.query(
            'UPDATE users SET is_active = TRUE, banned_posts_count = 0 WHERE id = ?',
            [this.id]
        );
        this.is_active = true;
        this.banned_posts_count = 0;
    }

    // Obtener usuarios inactivos
    static async findInactive() {
        const [rows] = await pool.query(
            'SELECT id, username, email, banned_posts_count, created_at FROM users WHERE is_active = FALSE AND deleted_at IS NULL'
        );
        return rows;
    }

    // Actualizar perfil
    async updateProfile(data) {
        const { username, email } = data;
        await pool.query(
            'UPDATE users SET username = ?, email = ? WHERE id = ?',
            [username, email, this.id]
        );
        this.username = username;
        this.email = email;
    }

    // Cambiar contraseña
    async changePassword(newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, this.id]
        );
        this.password = hashedPassword;
    }
}

module.exports = User;
