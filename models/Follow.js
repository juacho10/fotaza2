const pool = require('../config/db');

class Follow {
    // Verificar si sigue
    static async isFollowing(followerId, followedId) {
        const [rows] = await pool.query(
            'SELECT 1 FROM follows WHERE follower_id = ? AND followed_id = ?',
            [followerId, followedId]
        );
        return rows.length > 0;
    }

    // Obtener IDs de usuarios seguidos
    static async getFollowingIds(userId) {
        const [rows] = await pool.query(
            'SELECT followed_id FROM follows WHERE follower_id = ?',
            [userId]
        );
        return rows.map(row => row.followed_id);
    }

    // Obtener IDs de seguidores
    static async getFollowersIds(userId) {
        const [rows] = await pool.query(
            'SELECT follower_id FROM follows WHERE followed_id = ?',
            [userId]
        );
        return rows.map(row => row.follower_id);
    }

    // Obtener detalles de seguidos
    static async getFollowingWithDetails(userId, limit = 20) {
        const [rows] = await pool.query(`
            SELECT u.id, u.username, u.email, u.created_at,
                   (SELECT COUNT(*) FROM posts WHERE user_id = u.id AND deleted_at IS NULL) as post_count
            FROM follows f
            JOIN users u ON f.followed_id = u.id
            WHERE f.follower_id = ? AND u.deleted_at IS NULL
            LIMIT ?
        `, [userId, limit]);
        return rows;
    }

    // Obtener detalles de seguidores
    static async getFollowersWithDetails(userId, limit = 20) {
        const [rows] = await pool.query(`
            SELECT u.id, u.username, u.email, u.created_at,
                   (SELECT COUNT(*) FROM posts WHERE user_id = u.id AND deleted_at IS NULL) as post_count
            FROM follows f
            JOIN users u ON f.follower_id = u.id
            WHERE f.followed_id = ? AND u.deleted_at IS NULL
            LIMIT ?
        `, [userId, limit]);
        return rows;
    }
}

module.exports = Follow;
