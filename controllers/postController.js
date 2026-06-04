const Post = require('../models/Post');
const Image = require('../models/Image');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'fotaza2',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'ogg'],
        resource_type: 'auto',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }]
    }
});

const fileFilter = (req, file, cb) => {
    const allowedImages = /jpeg|jpg|png|gif|webp/;
    const allowedVideos = /mp4|webm|ogg/;
    const extname = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype;
    
    if (allowedImages.test(extname) && allowedImages.test(mimetype)) {
        req.fileType = 'image';
        cb(null, true);
    } else if (allowedVideos.test(extname) && allowedVideos.test(mimetype)) {
        req.fileType = 'video';
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes (jpg, png, gif, webp) o videos (mp4, webm, ogg)'));
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: fileFilter
}).array('media', 10);

exports.showCreate = (req, res) => {
    const genres = ['paisaje', 'naturaleza', 'urbano', 'retrato', 'abstracto', 'deporte', 'animales', 'comida', 'moda', 'tecnología', 'otro'];
    res.render('posts/create', { title: 'Crear publicación', genres });
};

exports.create = async (req, res) => {
    upload(req, res, async function (err) {
        if (err) {
            console.error('Error en upload:', err);
            return res.render('posts/create', { 
                title: 'Crear publicación', 
                error: 'Error al subir los archivos: ' + err.message,
                genres: ['paisaje', 'naturaleza', 'urbano', 'retrato', 'abstracto', 'deporte', 'animales', 'comida', 'moda', 'tecnología', 'otro']
            });
        }
        
        const { title, description, genre, tags, license, watermark } = req.body;
        const files = req.files;
        
        if (!files || files.length === 0) {
            return res.render('posts/create', { 
                title: 'Crear publicación', 
                error: 'Debes subir al menos una imagen o video',
                genres: ['paisaje', 'naturaleza', 'urbano', 'retrato', 'abstracto', 'deporte', 'animales', 'comida', 'moda', 'tecnología', 'otro']
            });
        }
        
        try {
            const postId = await Post.create({ 
                title, description, genre: genre || null, tags, user_id: req.session.userId 
            });
            const post = await Post.findById(postId);
            
            for (const file of files) {
                let finalUrl = file.path;
                let publicId = file.filename;
                
                if (req.fileType === 'image' && license === 'copyright' && watermark && watermark.trim()) {
                    finalUrl = cloudinary.url(publicId, {
                        transformation: [
                            { overlay: { font_family: "Arial", font_size: 24, font_weight: "bold", text: encodeURIComponent(watermark), color: "white" }},
                            { gravity: "south_east", x: 10, y: 10 },
                            { flags: "layer_apply" }
                        ]
                    });
                }
                
                if (req.fileType === 'image') {
                    await post.addImage(finalUrl, license || 'free', watermark);
                } else if (req.fileType === 'video') {
                    await post.addVideo(finalUrl, null, 0);
                }
            }
            res.redirect(`/posts/${postId}`);
        } catch (error) {
            console.error(error);
            res.render('posts/create', { 
                title: 'Crear publicación', 
                error: 'Error al crear la publicación: ' + error.message,
                genres: ['paisaje', 'naturaleza', 'urbano', 'retrato', 'abstracto', 'deporte', 'animales', 'comida', 'moda', 'tecnología', 'otro']
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
        const videos = await post.getVideos();
        const comments = await post.getComments();
        const userRating = req.session.userId ? await Image.getUserRatingForPost(req.session.userId, post.id) : null;
        const hasInterest = req.session.userId ? await post.hasInterest(req.session.userId) : false;
        const reportCount = await post.getReportCount();
        
        res.render('posts/show', { 
            title: post.title, post, images, videos, comments, userRating, hasInterest,
            isReported: reportCount >= 3, isOwner: req.session.userId === post.user_id
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('500', { title: 'Error del servidor' });
    }
};

exports.edit = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post || post.is_banned) return res.status(404).render('404', { title: 'Publicación no encontrada' });
        if (post.user_id !== req.session.userId) return res.status(403).render('403', { title: 'No autorizado' });
        
        if (post.is_reported) {
            return res.render('posts/edit', { title: 'Editar publicación', post, error: 'Esta publicación ha sido denunciada y no puede ser modificada' });
        }
        
        const images = await post.getImages();
        const genres = ['paisaje', 'naturaleza', 'urbano', 'retrato', 'abstracto', 'deporte', 'animales', 'comida', 'moda', 'tecnología', 'otro'];
        res.render('posts/edit', { title: 'Editar publicación', post, images, genres });
    } catch (error) {
        console.error(error);
        res.status(500).render('500', { title: 'Error del servidor' });
    }
};

exports.update = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post || post.user_id !== req.session.userId) return res.status(403).json({ error: 'No autorizado' });
        if (post.is_reported) return res.status(400).json({ error: 'Esta publicación ha sido denunciada y no puede ser modificada' });
        
        const { title, description, genre, tags, comments_open } = req.body;
        await post.update({ title, description, genre, tags, comments_open });
        res.redirect(`/posts/${post.id}`);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Error al actualizar' });
    }
};

exports.delete = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post || post.user_id !== req.session.userId) return res.status(403).json({ error: 'No autorizado' });
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
        if (!post) return res.status(404).json({ error: 'Publicación no encontrada' });
        if (!post.comments_open) return res.status(403).json({ error: 'Los comentarios están cerrados' });
        
        const { content } = req.body;
        if (!content || content.trim() === '') return res.status(400).json({ error: 'El comentario no puede estar vacío' });
        
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
        if (!comment) return res.status(404).json({ error: 'Comentario no encontrado' });
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
        if (!post || post.user_id !== req.session.userId) return res.status(403).json({ error: 'No autorizado' });
        await post.toggleComments();
        res.redirect(`/posts/${post.id}`);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al cambiar estado de comentarios' });
    }
};

// ========== MÉTODO rateImage  ==========
exports.rateImage = async (req, res) => {
    try {
        const image = await Image.findById(req.params.imageId);
        if (!image) return res.status(404).json({ error: 'Imagen no encontrada' });
        
        const { value } = req.body;
        const ratingValue = parseInt(value);
        if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
            return res.status(400).json({ error: 'Valoración debe ser entre 1 y 5' });
        }
        
        await image.addRating(req.session.userId, ratingValue);
        
        const updatedImage = await Image.findById(req.params.imageId);
        const post = await Post.findById(updatedImage.post_id);
        
        res.json({ 
            success: true, 
            average_rating: updatedImage.average_rating,
            rating_count: updatedImage.rating_count,
            post_avg_rating: post.avg_rating,
            post_rating_count: post.rating_count
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message || 'Error al valorar imagen' });
    }
};

// ========== MÉTODO markInterest  ==========
exports.markInterest = async (req, res) => {
    try {
        const { imageId, postId } = req.body;
        let targetPostId = postId;
        let targetImageId = imageId || null;
        
        if (imageId) {
            const image = await Image.findById(imageId);
            if (!image) return res.status(404).json({ error: 'Imagen no encontrada' });
            targetPostId = image.post_id;
        }
        
        const post = await Post.findById(targetPostId);
        if (!post) return res.status(404).json({ error: 'Publicación no encontrada' });
        
        await post.markInterest(req.session.userId, targetImageId);
        
        res.json({ success: true, message: 'Interés registrado. El autor ha sido notificado y puede contactarte.' });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message || 'Error al marcar interés' });
    }
};

exports.reportPost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ error: 'Publicación no encontrada' });
        if (post.user_id === req.session.userId) return res.status(403).json({ error: 'No puedes denunciar tu propia publicación' });
        
        const { reason, description } = req.body;
        if (!reason) return res.status(400).json({ error: 'Debes seleccionar un motivo' });
        
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
        if (!comment) return res.status(404).json({ error: 'Comentario no encontrado' });
        if (comment.user_id === req.session.userId) return res.status(403).json({ error: 'No puedes denunciar tu propio comentario' });
        
        const { reason, description } = req.body;
        if (!reason) return res.status(400).json({ error: 'Debes seleccionar un motivo' });
        
        await comment.report(req.session.userId, reason, description);
        res.redirect(`/posts/${comment.post_id}#comments`);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al denunciar' });
    }
};

exports.myReportedComments = async (req, res) => {
    console.log('📌 MY REPORTED COMMENTS - Usuario:', req.session.userId);
    try {
        const reportedComments = await Comment.findReportedByUser(req.session.userId);
        const formattedReports = (reportedComments || []).map(report => ({
            id: report.id,
            comment_id: report.comment_id || report.id,
            post_id: report.post_id,
            content: report.content || 'Contenido no disponible',
            reason: report.reason || 'No especificado',
            description: report.description || '',
            reporter_username: report.reporter_username || 'Usuario desconocido',
            created_at: report.created_at,
            status: report.status || 'pending'
        }));
        
        res.render('users/reported-comments', {
            title: 'Mis comentarios denunciados',
            reportedComments: formattedReports
        });
    } catch (error) {
        console.error('❌ Error en myReportedComments:', error.message);
        res.render('users/reported-comments', {
            title: 'Mis comentarios denunciados',
            reportedComments: [],
            error: 'Error al cargar los comentarios denunciados'
        });
    }
};