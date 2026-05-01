const Post = require('../models/Post');
const Image = require('../models/Image');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
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
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB para videos
    fileFilter: fileFilter
}).array('media', 10);

exports.showCreate = (req, res) => {
    const genres = ['paisaje', 'naturaleza', 'urbano', 'retrato', 'abstracto', 'deporte', 'animales', 'comida', 'moda', 'tecnología', 'otro'];
    res.render('posts/create', { title: 'Crear publicación', genres });
};

exports.create = async (req, res) => {
    upload(req, res, async function (err) {
        if (err) {
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
                title, 
                description, 
                genre: genre || null,
                tags, 
                user_id: req.session.userId 
            });
            
            const post = await Post.findById(postId);
            
            for (const file of files) {
                let finalPath = `/uploads/${file.filename}`;
                let finalFilePath = file.path;
                
                if (req.fileType === 'image' && license && license.toString() === 'copyright' && watermark && watermark.trim()) {
                    const watermarkFilename = file.filename.replace(/\.\w+$/, '_wm$&');
                    const watermarkPath = path.join(uploadDir, watermarkFilename);
                    
                    try {
                        await sharp(file.path)
                            .composite([{
                                input: Buffer.from(
                                    `<svg width="400" height="200">
                                        <text x="10" y="190" fill="rgba(0,0,0,0.7)" 
                                              font-size="24" font-family="Arial" font-weight="bold">${watermark}</text>
                                        <text x="8" y="188" fill="rgba(255,255,255,0.9)" 
                                              font-size="24" font-family="Arial" font-weight="bold">${watermark}</text>
                                     </svg>`
                                ),
                                gravity: 'southeast'
                            }])
                            .toFile(watermarkPath);
                        
                        finalPath = `/uploads/${watermarkFilename}`;
                        finalFilePath = watermarkPath;
                        fs.unlinkSync(file.path);
                    } catch (sharpError) {
                        console.error('Error al aplicar marca de agua:', sharpError);
                    }
                    
                    await post.addImage(finalPath, license, watermark);
                } else if (req.fileType === 'image') {
                    await post.addImage(finalPath, license || 'free', null);
                } else if (req.fileType === 'video') {
                    await post.addVideo(finalPath, null, 0);
                }
            }
            
            res.redirect(`/posts/${postId}`);
        } catch (error) {
            console.error(error);
            if (files) {
                files.forEach(file => {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                });
            }
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
        const userRating = req.session.userId ? 
            await Image.getUserRatingForPost(req.session.userId, post.id) : null;
        const hasInterest = req.session.userId ? 
            await post.hasInterest(req.session.userId) : false;
        const reportCount = await post.getReportCount();
        
        res.render('posts/show', { 
            title: post.title, 
            post, 
            images, 
            videos,
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
        if (!post || post.user_id !== req.session.userId) {
            return res.status(403).json({ error: 'No autorizado' });
        }
        
        if (post.is_reported) {
            return res.status(400).json({ error: 'Esta publicación ha sido denunciada y no puede ser modificada' });
        }
        
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
        const { imageId, postId } = req.body;
        let targetPostId = postId;
        let targetImageId = imageId || null;
        
        if (imageId) {
            const image = await Image.findById(imageId);
            if (!image) {
                return res.status(404).json({ error: 'Imagen no encontrada' });
            }
            targetPostId = image.post_id;
        }
        
        const post = await Post.findById(targetPostId);
        if (!post) {
            return res.status(404).json({ error: 'Publicación no encontrada' });
        }
        
        await post.markInterest(req.session.userId, targetImageId);
        
        res.json({ 
            success: true, 
            message: 'Interés registrado. El autor ha sido notificado y puede contactarte.' 
        });
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

exports.myReportedComments = async (req, res) => {
    try {
        const reportedComments = await Comment.findReportedByUser(req.session.userId);
        res.render('users/reported-comments', {
            title: 'Mis comentarios denunciados',
            reportedComments
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('500', { title: 'Error del servidor' });
    }
};