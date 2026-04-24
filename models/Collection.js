const pool = require('../config/db');

class Collection {
    constructor(data) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.name = data.name;
        this.created_at = data.created_at;
        this.post_count = data.post_count || 0;
    }

    // Obtener colecciones por usuario
    static async findByUser(userId) {
        const [rows] = await pool.query(`
            SELECT c.*, COUNT(ci.id) as post_count
            FROM collections c
            LEFT JOIN collection_items ci ON c.id = ci.collection_id
            WHERE c.user_id = ?
            GROUP BY c.id
            ORDER BY c.created_at DESC
        `, [userId]);
        return rows.map(row => new Collection(row));
    }

    // Buscar por ID
    static async findById(id) {
        const [rows] = await pool.query('SELECT * FROM collections WHERE id = ?', [id]);
        if (rows.length === 0) return null;
        return new Collection(rows[0]);
    }

    // Crear colección
    static async create(userId, name) {
        const [result] = await pool.query(
            'INSERT INTO collections (user_id, name) VALUES (?, ?)',
            [userId, name]
        );
        return result.insertId;
    }

    // Agregar publicación a colección
    async addPost(postId) {
        try {
            await pool.query(
                'INSERT INTO collection_items (collection_id, post_id) VALUES (?, ?)',
                [this.id, postId]
            );
            return true;
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('La publicación ya está en esta colección');
            }
            throw error;
        }
    }

    // Eliminar publicación de colección
    async removePost(postId) {
        const [result] = await pool.query(
            'DELETE FROM collection_items WHERE collection_id = ? AND post_id = ?',
            [this.id, postId]
        );
        return result.affectedRows > 0;
    }

    // Obtener publicaciones de la colección
    async getPosts() {
        const [rows] = await pool.query(`
            SELECT p.*, u.username
            FROM collection_items ci
            JOIN posts p ON ci.post_id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE ci.collection_id = ? AND p.deleted_at IS NULL AND p.is_banned = FALSE
            ORDER BY ci.created_at DESC
        `, [this.id]);
        return rows;
    }

    // Actualizar nombre
    async updateName(newName) {
        await pool.query(
            'UPDATE collections SET name = ? WHERE id = ?',
            [newName, this.id]
        );
        this.name = newName;
    }

    // Eliminar colección
    async delete() {
        await pool.query(
            'DELETE FROM collections WHERE id = ?',
            [this.id]
        );
    }
}

module.exports = Collection;
