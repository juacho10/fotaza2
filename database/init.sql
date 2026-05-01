DROP DATABASE IF EXISTS fotaza2_db;
CREATE DATABASE fotaza2_db;
USE fotaza2_db;

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

CREATE TABLE posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    genre VARCHAR(100) NULL,
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
    INDEX idx_genre (genre),
    FULLTEXT INDEX idx_search (title, description, tags)
);

CREATE TABLE videos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    thumbnail_path VARCHAR(255) NULL,
    duration INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    INDEX idx_post_id (post_id)
);

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

CREATE TABLE comment_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    comment_id INT NOT NULL,
    reporter_id INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('pending', 'approved', 'dismissed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_comment_id (comment_id)
);

CREATE TABLE reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'approved', 'dismissed') DEFAULT 'pending',
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_post_id (post_id)
);

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

CREATE TABLE interests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    image_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_interest (user_id, post_id, image_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
    INDEX idx_post_id (post_id),
    INDEX idx_user_id (user_id)
);

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

CREATE TABLE collections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);


CREATE TABLE collection_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    collection_id INT NOT NULL,
    post_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_item (collection_id, post_id),
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);


CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('comment', 'rating', 'interest', 'follow', 'message', 'comment_reported') NOT NULL,
    source_user_id INT NOT NULL,
    image_id INT NULL,
    post_id INT NULL,
    message_id INT NULL,
    comment_id INT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (source_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    INDEX idx_user_unread (user_id, is_read)
);


INSERT INTO users (username, email, password, role, is_active) VALUES 
('admin', 'admin@fotaza2.com', '$2a$10$/d4BvmJW0DZmfPbo5QvLK.RJwD1O1ilL/gxOWf8kU.G.w7MBbVYBS', 'admin', 1),
('validator', 'validator@fotaza2.com', '$2a$10$/d4BvmJW0DZmfPbo5QvLK.RJwD1O1ilL/gxOWf8kU.G.w7MBbVYBS', 'validator', 1),
('juan_perez', 'juan@example.com', '$2a$10$/d4BvmJW0DZmfPbo5QvLK.RJwD1O1ilL/gxOWf8kU.G.w7MBbVYBS', 'user', 1),
('maria_garcia', 'maria@example.com', '$2a$10$/d4BvmJW0DZmfPbo5QvLK.RJwD1O1ilL/gxOWf8kU.G.w7MBbVYBS', 'user', 1),
('carlos_lopez', 'carlos@example.com', '$2a$10$/d4BvmJW0DZmfPbo5QvLK.RJwD1O1ilL/gxOWf8kU.G.w7MBbVYBS', 'user', 1),
('ana_rodriguez', 'ana@example.com', '$2a$10$/d4BvmJW0DZmfPbo5QvLK.RJwD1O1ilL/gxOWf8kU.G.w7MBbVYBS', 'user', 1);


INSERT INTO posts (title, description, genre, tags, user_id, created_at) VALUES
('Atardecer en la montaña', 'Hermoso atardecer capturado en las montañas de los Andes.', 'paisaje', 'paisaje,montaña,atardecer', 3, NOW() - INTERVAL 10 DAY),
('Playa del Carmen', 'Aguas cristalinas y arena blanca en la riviera maya.', 'paisaje', 'playa,mar,caribe', 4, NOW() - INTERVAL 8 DAY),
('Bosque de niebla', 'Misterioso bosque cubierto de niebla en la mañana.', 'naturaleza', 'bosque,naturaleza,niebla', 5, NOW() - INTERVAL 5 DAY),
('Ciudad nocturna', 'Vista panorámica de la ciudad iluminada de noche.', 'urbano', 'ciudad,noche,urban', 3, NOW() - INTERVAL 3 DAY),
('Flor de loto', 'Detalle de una hermosa flor de loto en el estanque.', 'naturaleza', 'flor,naturaleza,detalle', 6, NOW() - INTERVAL 1 DAY);

INSERT INTO images (post_id, file_path, license, watermark_text, average_rating, rating_count) VALUES
(1, '/uploads/placeholder.jpg', 'copyright', '© Juan Perez', 4.5, 2),
(2, '/uploads/placeholder.jpg', 'free', NULL, 5.0, 1),
(3, '/uploads/placeholder.jpg', 'copyright', '© Carlos Lopez', 4.0, 1),
(4, '/uploads/placeholder.jpg', 'free', NULL, 4.0, 1),
(5, '/uploads/placeholder.jpg', 'copyright', '© Ana Rodriguez', 0, 0);


INSERT INTO follows (follower_id, followed_id) VALUES
(3, 4), (3, 5), (4, 3), (4, 6), (5, 3), (6, 4);


INSERT INTO collections (user_id, name) VALUES
(3, 'Favoritos'),
(3, 'Inspiración'),
(4, 'Para comprar');


INSERT INTO collection_items (collection_id, post_id) VALUES
(1, 2), (1, 4), (2, 3), (3, 1);


INSERT INTO comments (user_id, post_id, content) VALUES
(4, 1, '¡Qué hermosa foto! Me encanta la composición.'),
(5, 1, 'Excelente trabajo, la luz está perfecta.'),
(3, 2, 'Me encantaría visitar este lugar.'),
(6, 3, 'Parece sacado de un cuento de hadas.'),
(4, 4, 'Increíble la calidad de la imagen.');


INSERT INTO ratings (user_id, image_id, value) VALUES
(4, 1, 5), (5, 1, 4), (6, 2, 5), (3, 3, 4), (4, 4, 4);