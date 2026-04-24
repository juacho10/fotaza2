const Post = require('../models/Post');
const Image = require('../models/Image');
const Comment = require('../models/Comment');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Solo se permiten imágenes'));
    }
}).array('images', 10);

exports.showCreate = (req, res) => {
    res.render('posts/create', { title: 'Crear publicación' });
};

exports.create = async (req, res) => {
    upload(req, res, async function (err) {
        if (err) {
            return res.render('posts/create', { 
                title: 'Crear publicación', 
                error: 'Error al subir las imágenes: ' + err.message 
            });
        }
        
        const { title, description, tags, license, watermark } = req.body;
        const images = req.files;
        
        if (!images || images.length === 0) {
            return res.render('posts/create', { 
                title: 'Crear publicación', 
                error: 'Debes subir al menos una imagen' 
            });
        }
        
        try {
            const postId = await Post.create({ 
                title, 
                description, 
                tags, 
                user_id: req.session.userId 
            });
            
            const post = await Post.findById(postId);
            
            for (const image of images) {
                let finalPath = `/uploads/${image.filename}`;
                let finalFilePath = image.path;
                
                if (license && license.toString() === 'copyright' && watermark && watermark.trim()) {
                    const watermarkFilename = image.filename.replace(/\.\w+$/, '_wm$&');
                    const watermarkPath = path.join(uploadDir, watermarkFilename);
                    
                    try {
                        await sharp(image.path)
                            .composite([{
                                input: Buffer.from(
                                    `<svg width="300" height="150">
                                        <text x="10" y="140" fill="rgba(0,0,0,0.6)" 
                                              font-size="20" font-family="Arial">${watermark}</text>
                                        <text x="8" y="138" fill="rgba(255,255,255,0.8)" 
                                              font-size="20" font-family="Arial">${watermark}</text>
                                     </svg>`
                                ),
                                gravity: 'southeast'
                            }])
                            .toFile(watermarkPath);
                        
                        finalPath = `/uploads/${watermarkFilename}`;
                        finalFilePath = watermarkPath;
                        fs.unlinkSync(image.path);
                    } catch (sharpError) {
                        console.error('Error al aplicar marca de agua:', sharpError);
                    }
                }
                
                await post.addImage(finalPath, license || 'free', watermark || null);
            }
            
            res.redirect(`/posts/${postId}`);
        } catch (error) {
            console.error(error);
            if (images) {
                images.forEach(image => {
                    if (fs.existsSync(image.path)) {
                        fs.unlinkSync(image.path);
                    }
                });
            }
            res.render('posts/create', { 
                title: 'Crear publicación', 
                error: 'Error al crear la publicación: ' + error.message 
            });
        }
    });
};

exports.show = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post || post.is_banned) {
            return res.status(404).render('404', { title: 'Publicación no encontrada' });
        }
        
        const images = await post.getImages();
        const comments = await post.getComments();
        const userRating = req.session.userId ? 
            await Image.getUserRatingForPost(req.session.userId, post.id) : null;
        const hasInterest = req.session.userId ? 
            await post.hasInterest(req.session.userId) : false;
        const reportCount = await post.getReportCount();
        
        res.render('posts/show', { 
            title: post.title, 
            post, 
            images, 
            comments,
            userRating,
            hasInterest,
            isReported: reportCount >= 3,
            isOwner: req.session.userId === post.user_id
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('500', { title: 'Error del servidor' });
    }
};

exports.edit = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post || post.is_banned) {
            return res.status(404).render('404', { title: 'Publicación no encontrada' });
        }
        
        if (post.user_id !== req.session.userId) {
            return res.status(403).render('403', { title: 'No autorizado' });
        }
        
        if (post.is_reported) {
            return res.render('posts/edit', { 
                title: 'Editar publicación', 
                post, 
                error: 'Esta publicación ha sido denunciada y no puede ser modificada' 
            });
        }
        
        const images = await post.getImages();
        res.render('posts/edit', { title: 'Editar publicación', post, images });
    } catch (error) {
        console.error(error);
        res.status(500).render('500', { title: 'Error del servidor' });
    }
};

exports.update = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post || post.user_id !== req.session.userId) {
            return res.status(403).json({ error: 'No autorizado' });
        }
        
        if (post.is_reported) {
            return res.status(400).json({ error: 'Esta publicación ha sido denunciada y no puede ser modificada' });
        }
        
        const { title, description, tags, comments_open } = req.body;
        await post.update({ title, description, tags, comments_open });
        
        res.redirect(`/posts/${post.id}`);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Error al actualizar' });
    }
};

exports.delete = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post || post.user_id !== req.session.userId) {
            return res.status(403).json({ error: 'No autorizado' });
        }
        
        await post.softDelete();
        res.redirect(`/users/${req.session.userId}`);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar' });
    }
};

exports.addComment = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Publicación no encontrada' });
        }
        
        if (!post.comments_open) {
            return res.status(403).json({ error: 'Los comentarios están cerrados' });
        }
        
        const { content } = req.body;
        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'El comentario no puede estar vacío' });
        }
        
        await post.addComment(req.session.userId, content);
        res.redirect(`/posts/${post.id}#comments`);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al agregar comentario' });
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId);
        if (!comment) {
            return res.status(404).json({ error: 'Comentario no encontrado' });
        }
        
        const post = await Post.findById(comment.post_id);
        
        if (comment.user_id !== req.session.userId && post.user_id !== req.session.userId) {
            return res.status(403).json({ error: 'No autorizado' });
        }
        
        await comment.softDelete();
        res.redirect(`/posts/${post.id}#comments`);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar comentario' });
    }
};

exports.toggleComments = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post || post.user_id !== req.session.userId) {
            return res.status(403).json({ error: 'No autorizado' });
        }
        
        await post.toggleComments();
        res.redirect(`/posts/${post.id}`);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al cambiar estado de comentarios' });
    }
};

exports.rateImage = async (req, res) => {
    try {
        const image = await Image.findById(req.params.imageId);
        if (!image) {
            return res.status(404).json({ error: 'Imagen no encontrada' });
        }
        
        const { value } = req.body;
        const ratingValue = parseInt(value);
        
        if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
            return res.status(400).json({ error: 'Valoración debe ser entre 1 y 5' });
        }
        
        await image.addRating(req.session.userId, ratingValue);
        
        res.json({ 
            success: true, 
            average_rating: image.average_rating,
            rating_count: image.rating_count
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message || 'Error al valorar imagen' });
    }
};

exports.markInterest = async (req, res) => {
    try {
        const image = await Image.findById(req.params.imageId);
        if (!image) {
            return res.status(404).json({ error: 'Imagen no encontrada' });
        }
        
        await image.markInterest(req.session.userId);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message || 'Error al marcar interés' });
    }
};

exports.reportPost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Publicación no encontrada' });
        }
        
        if (post.user_id === req.session.userId) {
            return res.status(403).json({ error: 'No puedes denunciar tu propia publicación' });
        }
        
        const { reason, description } = req.body;
        if (!reason) {
            return res.status(400).json({ error: 'Debes seleccionar un motivo' });
        }
        
        await post.report(req.session.userId, reason, description);
        res.redirect(`/posts/${post.id}`);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al denunciar' });
    }
};

exports.reportComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId);
        if (!comment) {
            return res.status(404).json({ error: 'Comentario no encontrado' });
        }
        
        if (comment.user_id === req.session.userId) {
            return res.status(403).json({ error: 'No puedes denunciar tu propio comentario' });
        }
        
        const { reason, description } = req.body;
        if (!reason) {
            return res.status(400).json({ error: 'Debes seleccionar un motivo' });
        }
        
        await comment.report(req.session.userId, reason, description);
        res.redirect(`/posts/${comment.post_id}#comments`);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al denunciar' });
    }
};