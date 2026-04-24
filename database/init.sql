-- ============================================
-- FOTAZA 2 - BASE DE DATOS COMPLETA
-- CONTRASEÑA CORRECTA: password123
-- ============================================

DROP DATABASE IF EXISTS fotaza2_db;
CREATE DATABASE fotaza2_db;
USE fotaza2_db;

-- ============================================
-- TABLA DE USUARIOS
-- ============================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'validator', 'admin') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    banned_posts_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_email (email),
    INDEX idx_username (username)
);

-- ============================================
-- TABLA DE PUBLICACIONES
-- ============================================
CREATE TABLE posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    tags TEXT,
    user_id INT NOT NULL,
    comments_open BOOLEAN DEFAULT TRUE,
    is_reported BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    report_count INT DEFAULT 0,
    avg_rating DECIMAL(3,2) DEFAULT 0,
    rating_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    FULLTEXT INDEX idx_search (title, description, tags)
);

-- ============================================
-- TABLA DE IMÁGENES
-- ============================================
CREATE TABLE images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    license ENUM('copyright', 'free') DEFAULT 'copyright',
    watermark_text VARCHAR(100) NULL,
    average_rating DECIMAL(3,2) DEFAULT 0,
    rating_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    INDEX idx_post_id (post_id)
);

-- ============================================
-- TABLA DE VALORACIONES
-- ============================================
CREATE TABLE ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    image_id INT NOT NULL,
    value TINYINT NOT NULL CHECK (value >= 1 AND value <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_rating (user_id, image_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
    INDEX idx_image_id (image_id)
);

-- ============================================
-- TABLA DE COMENTARIOS
-- ============================================
CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    content TEXT NOT NULL,
    is_reported BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    INDEX idx_post_id (post_id)
);

-- ============================================
-- TABLA DE DENUNCIAS
-- ============================================
CREATE TABLE reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    post_id INT NULL,
    comment_id INT NULL,
    reason VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'approved', 'dismissed') DEFAULT 'pending',
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    CHECK ( (post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL) ),
    INDEX idx_status (status)
);

-- ============================================
-- TABLA DE SEGUIDORES
-- ============================================
CREATE TABLE follows (
    id INT AUTO_INCREMENT PRIMARY KEY,
    follower_id INT NOT NULL,
    followed_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_follow (follower_id, followed_id),
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (followed_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (follower_id != followed_id),
    INDEX idx_follower (follower_id),
    INDEX idx_followed (followed_id)
);

-- ============================================
-- TABLA DE INTERESES ("ME INTERESA")
-- ============================================
CREATE TABLE interests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_interest (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    INDEX idx_post_id (post_id)
);

-- ============================================
-- TABLA DE MENSAJERÍA PRIVADA
-- ============================================
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_receiver (receiver_id, is_read),
    INDEX idx_sender (sender_id)
);

-- ============================================
-- TABLA DE COLECCIONES
-- ============================================
CREATE TABLE collections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- ============================================
-- TABLA DE ITEMS DE COLECCIONES
-- ============================================
CREATE TABLE collection_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    collection_id INT NOT NULL,
    post_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_item (collection_id, post_id),
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- ============================================
-- TABLA DE NOTIFICACIONES
-- ============================================
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('comment', 'rating', 'interest', 'follow', 'message') NOT NULL,
    source_user_id INT NOT NULL,
    image_id INT NULL,
    post_id INT NULL,
    message_id INT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (source_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    INDEX idx_user_unread (user_id, is_read)
);

-- ============================================
-- DATOS DE PRUEBA - CONTRASEÑA: password123
-- Hash REAL generado con bcrypt.hash('password123', 10)
-- ============================================

INSERT INTO users (username, email, password, role, is_active) VALUES 
('admin', 'admin@fotaza2.com', '$2a$10$/d4BvmJW0DZmfPbo5QvLK.RJwD1O1ilL/gxOWf8kU.G.w7MBbVYBS', 'admin', 1),
('validator', 'validator@fotaza2.com', '$2a$10$/d4BvmJW0DZmfPbo5QvLK.RJwD1O1ilL/gxOWf8kU.G.w7MBbVYBS', 'validator', 1),
('juan_perez', 'juan@example.com', '$2a$10$/d4BvmJW0DZmfPbo5QvLK.RJwD1O1ilL/gxOWf8kU.G.w7MBbVYBS', 'user', 1),
('maria_garcia', 'maria@example.com', '$2a$10$/d4BvmJW0DZmfPbo5QvLK.RJwD1O1ilL/gxOWf8kU.G.w7MBbVYBS', 'user', 1),
('carlos_lopez', 'carlos@example.com', '$2a$10$/d4BvmJW0DZmfPbo5QvLK.RJwD1O1ilL/gxOWf8kU.G.w7MBbVYBS', 'user', 1),
('ana_rodriguez', 'ana@example.com', '$2a$10$/d4BvmJW0DZmfPbo5QvLK.RJwD1O1ilL/gxOWf8kU.G.w7MBbVYBS', 'user', 1);
-- Publicaciones de ejemplo
INSERT INTO posts (title, description, tags, user_id, created_at) VALUES
('Atardecer en la montaña', 'Hermoso atardecer capturado en las montañas de los Andes. La luz dorada bañando los picos nevados crea un espectáculo único.', 'paisaje,montaña,atardecer,naturaleza', 3, NOW() - INTERVAL 10 DAY),
('Playa del Carmen', 'Aguas cristalinas y arena blanca en la riviera maya. Un paraíso tropical que parece sacado de un sueño.', 'playa,mar,caribe,verano', 4, NOW() - INTERVAL 8 DAY),
('Bosque de niebla', 'Misterioso bosque cubierto de niebla en la mañana. La atmósfera mágica y los rayos de sol crean un ambiente único.', 'bosque,naturaleza,niebla,misterio', 5, NOW() - INTERVAL 5 DAY),
('Ciudad nocturna', 'Vista panorámica de la ciudad iluminada de noche. Las luces crean un tapiz urbano fascinante.', 'ciudad,noche,urban,arquitectura', 3, NOW() - INTERVAL 3 DAY),
('Flor de loto', 'Detalle de una hermosa flor de loto en el estanque. La pureza y elegancia de esta flor en todo su esplendor.', 'flor,naturaleza,detalle,jardin', 6, NOW() - INTERVAL 1 DAY);

-- Imágenes de ejemplo
INSERT INTO images (post_id, file_path, license, average_rating, rating_count) VALUES
(1, '/uploads/placeholder.jpg', 'copyright', 4.5, 2),
(2, '/uploads/placeholder.jpg', 'free', 5.0, 1),
(3, '/uploads/placeholder.jpg', 'copyright', 4.0, 1),
(4, '/uploads/placeholder.jpg', 'free', 4.0, 1),
(5, '/uploads/placeholder.jpg', 'copyright', 0, 0);

-- Seguidores de ejemplo
INSERT INTO follows (follower_id, followed_id) VALUES
(3, 4), (3, 5), (4, 3), (4, 6), (5, 3), (6, 4);

-- Colecciones de ejemplo
INSERT INTO collections (user_id, name) VALUES
(3, 'Favoritos'),
(3, 'Inspiración'),
(4, 'Para comprar');

-- Items de colecciones
INSERT INTO collection_items (collection_id, post_id) VALUES
(1, 2), (1, 4), (2, 3), (3, 1);

-- Comentarios de ejemplo
INSERT INTO comments (user_id, post_id, content) VALUES
(4, 1, '¡Qué hermosa foto! Me encanta la composición y los colores.'),
(5, 1, 'Excelente trabajo, la luz está perfectamente capturada.'),
(3, 2, 'Me encantaría visitar este lugar, parece un paraíso.'),
(6, 3, 'Parece sacado de un cuento de hadas, increíble.'),
(4, 4, 'Increíble la calidad de la imagen, felicitaciones.');

-- Valoraciones de ejemplo
INSERT INTO ratings (user_id, image_id, value) VALUES
(4, 1, 5), (5, 1, 4), (6, 2, 5), (3, 3, 4), (4, 4, 4);